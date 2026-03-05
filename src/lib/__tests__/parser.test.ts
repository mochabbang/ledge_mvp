import { parse } from "../parser";

// 08_acceptance_tests.md 파서 테스트
describe("파서 금액 추출", () => {
  test("50만원 → 500000, needs_confirm=false", () => {
    const r = parse("외주 50만원")!;
    expect(r.amount).toBe(500000);
    expect(r.needs_confirm).toBe(false);
  });

  test("12만 → 120000, needs_confirm=false", () => {
    const r = parse("광고비 12만")!;
    expect(r.amount).toBe(120000);
    expect(r.needs_confirm).toBe(false);
  });

  test("1.5만 → 15000, needs_confirm=false", () => {
    const r = parse("점심 1.5만")!;
    expect(r.amount).toBe(15000);
    expect(r.needs_confirm).toBe(false);
  });

  test("1.2만 → 12000, needs_confirm=false", () => {
    const r = parse("점심 1.2만")!;
    expect(r.amount).toBe(12000);
    expect(r.needs_confirm).toBe(false);
  });

  test("35000 → 35000, needs_confirm=false", () => {
    const r = parse("교재비 35000")!;
    expect(r.amount).toBe(35000);
    expect(r.needs_confirm).toBe(false);
  });

  test("30 → 30, needs_confirm=true", () => {
    const r = parse("강의료 30")!;
    expect(r.amount).toBe(30);
    expect(r.needs_confirm).toBe(true);
    expect(r.amount_candidates).toEqual([30, 30000]);
  });
});

// 08_acceptance_tests.md 타입 테스트
describe("파서 타입 분류", () => {
  test("광고비 12만 → expense", () => {
    expect(parse("광고비 12만")!.type).toBe("expense");
  });

  test("점심 1.2만 → expense", () => {
    expect(parse("점심 1.2만")!.type).toBe("expense");
  });

  test("외주 50만원 → income", () => {
    expect(parse("외주 50만원")!.type).toBe("income");
  });

  test("교재비 35000 → expense (키워드 없음 → 기본 expense)", () => {
    expect(parse("교재비 35000")!.type).toBe("expense");
  });
});

describe("파서 예외", () => {
  test("금액 없으면 null 반환", () => {
    expect(parse("그냥 텍스트")).toBeNull();
  });
});
