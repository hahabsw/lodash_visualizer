# Lodash Visualizer

Next.js로 만든 lodash 데이터 변환 시각화 앱입니다.
`_.groupBy`는 입력 데이터 블록이 grouping key를 지나 output bucket으로 수렴하는 과정을 SVG block diagram으로 보여줍니다.
`_.map`은 입력 블록이 변환 블록을 통과해 새 output 블록으로 바뀌는 과정을 단계별로 보여줍니다.
각 lodash 함수는 `/groupBy`, `/map`, `/filter`처럼 별도 route로 열립니다.

## 실행

```bash
pnpm install --no-frozen-lockfile
pnpm dev
```

브라우저에서 `http://127.0.0.1:3000/groupBy`를 열면 됩니다.
