import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-20">
      <div className="animate-rise">
        <p className="text-xs tracking-[0.3em] text-muted">첫 삽</p>

        <h1 className="mt-6 text-3xl leading-snug font-semibold sm:text-4xl">
          미루던 일은
          <br />
          <span className="text-accent">시작이 제일 무겁습니다.</span>
        </h1>

        <p className="mt-6 leading-relaxed text-muted">
          통째로 보면 못 합니다. 그래서 여기서는 <strong className="font-medium text-text">첫 조각 하나</strong>만
          꺼내 드립니다. 5분이면 되는 것으로요.
          <br />
          다 했는지는 묻지 않습니다. <strong className="font-medium text-text">시작했는지</strong>만 묻습니다.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-accent px-5 py-3 text-sm font-medium text-bg transition hover:brightness-110"
          >
            시작하기
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-line-strong px-5 py-3 text-sm text-muted transition hover:text-text"
          >
            로그인
          </Link>
        </div>

        <div className="mt-16 rounded-lg border border-line bg-surface p-6">
          <p className="text-xs tracking-[0.18em] text-muted">이렇게 됩니다</p>
          <p className="mt-4 text-sm text-muted">
            <span className="num text-warm">23일</span> 묵힌 «밀린 세금 서류 정리해서 제출»
          </p>
          <div className="mt-3 rounded-md border border-accent/50 bg-accent-soft px-4 py-3">
            <p className="text-xs tracking-[0.14em] text-accent">첫 삽 · 5분</p>
            <p className="mt-1.5 text-sm">서류 담을 폴더 하나 만들기. 그것만 하세요.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
