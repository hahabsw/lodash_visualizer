# Lodash Visualizer

Next.js로 만든 lodash 데이터 변환 시각화 앱입니다.
`_.groupBy`, `_.map`, `_.filter`, `_.reduce`, `_.find`, `_.sortBy`, `_.countBy`, `_.maxBy`, `_.minBy`, `_.meanBy`, `_.take`, `_.drop` 등 자주 쓰는 lodash 함수를 입력, 콜백, 출력 흐름으로 보여줍니다.
각 lodash 함수는 `/groupBy`, `/map`, `/reduce`처럼 별도 route로 열립니다.

## 실행

```bash
pnpm install --no-frozen-lockfile
pnpm dev
```

브라우저에서 `http://127.0.0.1:3000/groupBy`를 열면 됩니다.
