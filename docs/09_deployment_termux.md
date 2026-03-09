# 09. Termux (Ubuntu) 배포 가이드

Android Termux의 Ubuntu 환경에서 Ledge를 구동하고,
**Git 자동 배포** + **Cloudflare 구매 도메인 서브도메인 연결**까지 설정하는 방법입니다.

---

## 환경 전제

- Termux에 `proot-distro`로 Ubuntu가 설치되어 있음
- GitHub 저장소에 소스가 push되어 있음
- Cloudflare에서 도메인을 구매하여 네임서버가 Cloudflare로 설정되어 있음

---

## 1단계: Ubuntu 진입 및 기본 패키지 설치

```bash
# Termux에서 Ubuntu 진입
proot-distro login ubuntu

# 패키지 업데이트
apt update && apt upgrade -y

# 필수 패키지 설치
apt install -y git curl wget unzip

# Node.js 20 설치 (NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 버전 확인
node -v   # v20.x
npm -v
```

---

## 2단계: SSH 키 생성 및 GitHub 연결

비밀번호 없이 `git pull`이 되도록 SSH 키를 등록합니다.

```bash
# SSH 키 생성
ssh-keygen -t ed25519 -C "termux-deploy" -f ~/.ssh/id_ed25519 -N ""

# 공개키 출력 → 복사
cat ~/.ssh/id_ed25519.pub
```

1. 위 출력 내용을 복사
2. GitHub → Settings → SSH and GPG keys → **New SSH key** → 붙여넣기 → 저장

```bash
# 연결 테스트
ssh -T git@github.com
# "Hi username! You've successfully authenticated" 메시지 확인
```

---

## 3단계: 프로젝트 클론

```bash
cd ~

# SSH 방식으로 클론 (HTTPS 대신 SSH 사용)
git clone git@github.com:your-username/ledge_mvp_claude.git ledge
cd ledge
```

---

## 4단계: 환경변수 설정

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EOF
```

> `.env.local`은 `.gitignore`에 포함되어 있어 git으로 관리되지 않습니다.
> **배포 시마다 이 파일은 수동으로 유지**해야 합니다.

---

## 5단계: 초기 빌드 및 pm2 설정

```bash
# 의존성 설치
npm install

# 프로덕션 빌드
npm run build

# pm2 전역 설치
npm install -g pm2

# 서버 시작
pm2 start "npm run start" --name ledge

# 상태 확인
pm2 status
pm2 logs ledge

# Ubuntu 재시작 시 자동 실행 등록 (선택)
pm2 save
```

---

## 6단계: 자동 배포 스크립트 작성

GitHub에 push할 때마다 이 스크립트를 실행하면 최신 코드로 서버가 업데이트됩니다.

```bash
cat > ~/deploy.sh << 'EOF'
#!/bin/bash
set -e

APP_DIR="$HOME/ledge"
LOG="$HOME/deploy.log"

echo "===== $(date) 배포 시작 =====" >> $LOG

cd $APP_DIR

# 최신 코드 받기
git fetch origin
git reset --hard origin/main
echo "git pull 완료" >> $LOG

# 의존성 업데이트
npm install >> $LOG 2>&1

# 재빌드
npm run build >> $LOG 2>&1
echo "빌드 완료" >> $LOG

# 서버 재시작
pm2 restart ledge
echo "서버 재시작 완료" >> $LOG

echo "===== 배포 완료 =====" >> $LOG
EOF

chmod +x ~/deploy.sh
```

**사용법:**
```bash
# 코드 업데이트가 필요할 때 실행
~/deploy.sh

# 로그 확인
tail -f ~/deploy.log
```

---

## 7단계: Cloudflare 서브도메인 연결

구매한 도메인(예: `example.com`)에 `ledge.example.com` 서브도메인을 연결합니다.

### 7-A. cloudflared 설치 (Ubuntu 내부)

```bash
# ARM64용 cloudflared 다운로드
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 \
  -O /usr/local/bin/cloudflared
chmod +x /usr/local/bin/cloudflared

# 버전 확인
cloudflared --version
```

### 7-B. Cloudflare 로그인

```bash
cloudflared tunnel login
```

터미널에 URL이 출력됩니다. 해당 URL을 **PC 브라우저**에서 열어 Cloudflare 계정으로 로그인 → 도메인 선택 → 인증 완료.

> 인증 후 `~/.cloudflared/cert.pem` 파일이 생성됩니다.

### 7-C. 터널 생성

```bash
# 터널 이름: ledge (자유롭게 지정 가능)
cloudflared tunnel create ledge
```

출력에서 **Tunnel ID** (UUID 형식)를 복사해 둡니다.

```
Created tunnel ledge with id xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 7-D. 설정 파일 작성

```bash
mkdir -p ~/.cloudflared

cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx   # 위에서 복사한 Tunnel ID
credentials-file: /root/.cloudflared/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.json

ingress:
  - hostname: ledge.example.com   # 사용할 서브도메인
    service: http://localhost:3000
  - service: http_status:404
EOF
```

### 7-E. DNS CNAME 레코드 자동 등록

```bash
cloudflared tunnel route dns ledge ledge.example.com
```

이 명령어가 Cloudflare DNS에 자동으로 CNAME 레코드를 추가합니다.

**확인:** Cloudflare Dashboard → 도메인 → DNS → `ledge.example.com` CNAME 레코드가 생성되었는지 확인

### 7-F. 터널 실행

```bash
# 포그라운드 테스트
cloudflared tunnel run ledge
```

브라우저에서 `https://ledge.example.com` 접속하여 정상 동작 확인.

---

## 8단계: cloudflared 백그라운드 실행 (pm2)

```bash
# pm2로 cloudflared 백그라운드 실행
pm2 start "cloudflared tunnel run ledge" --name cloudflare-tunnel

# 저장
pm2 save

# 상태 확인
pm2 status
```

---

## 9단계: Ubuntu 재시작 후 자동 복구 스크립트

Termux/Ubuntu를 재시작할 때마다 서버와 터널을 자동으로 올리는 스크립트입니다.

```bash
cat > ~/start.sh << 'EOF'
#!/bin/bash
# Termux Ubuntu 진입 후 실행

# pm2 프로세스 복구 (ledge + cloudflare-tunnel)
pm2 resurrect || {
  cd ~/ledge && pm2 start "npm run start" --name ledge
  pm2 start "cloudflared tunnel run ledge" --name cloudflare-tunnel
  pm2 save
}

echo "서버 상태:"
pm2 status
EOF

chmod +x ~/start.sh
```

**Ubuntu 진입 직후 실행:**
```bash
proot-distro login ubuntu -- bash ~/start.sh
```

---

## 전체 운영 치트시트

```bash
# Ubuntu 진입
proot-distro login ubuntu

# 서버/터널 상태 확인
pm2 status

# 배포 (코드 업데이트)
~/deploy.sh

# 로그 실시간 확인
pm2 logs ledge --lines 50

# 서버만 재시작
pm2 restart ledge

# 터널만 재시작
pm2 restart cloudflare-tunnel

# 모두 종료
pm2 stop all
```

---

## Cloudflare Dashboard 확인 사항

배포 후 `https://ledge.example.com` 접속 전 아래를 확인하세요:

1. **DNS** → `ledge` CNAME 레코드 존재 여부
2. **SSL/TLS** → 암호화 모드: **Full** 또는 **Flexible** 설정
3. **Tunnel** → Zero Trust → Access → Tunnels → `ledge` 상태가 **HEALTHY** 인지 확인

---

## 주의사항

- `.env.local`은 git에 포함되지 않으므로 최초 설치 후 수동 작성 필요
- `pm2 save` 후 `pm2 resurrect`로 재부팅 복구 가능
- 빌드 중 메모리 부족 시: `NODE_OPTIONS=--max-old-space-size=512 npm run build`
- Cloudflare 터널은 **포트 포워딩 없이** 방화벽을 우회하므로 공유기 설정 불필요
- `DEPLOY_SECRET`는 서버의 `.env.local`에도 반드시 추가 필요

---

## GitHub Webhook 자동 배포 설정

### 서버 .env.local에 시크릿 추가

```bash
openssl rand -hex 32  # 시크릿 생성
echo "DEPLOY_SECRET=생성된값" >> ~/ledge/.env.local
```

### GitHub Webhook 등록

GitHub → 저장소 → Settings → Webhooks → Add webhook

| 항목 | 값 |
|---|---|
| Payload URL | `https://ledge.mochabbang.com/api/deploy` |
| Content type | `application/json` |
| Secret | 위에서 생성한 값 |
| Events | Just the push event |

push 시 자동으로 `~/deploy.sh`가 실행됩니다. 로그 확인:

```bash
tail -f ~/deploy.log
```
