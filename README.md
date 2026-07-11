# Lodash Visualizer

Next.js로 만든 lodash 데이터 변환 시각화 앱입니다.
`_.groupBy`, `_.map`, `_.filter`, `_.reduce`, `_.find`, `_.sortBy`, `_.countBy`, `_.maxBy`, `_.minBy`, `_.meanBy`, `_.take`, `_.drop`, `_.takeWhile`, `_.dropWhile`, `_.pick`, `_.omit` 등 자주 쓰는 lodash 함수를 입력, 콜백, 출력 흐름으로 보여줍니다.

객체 경로를 다루는 `_.get`/`_.set`, 객체를 합치는 `_.merge`/`_.defaultsDeep`, 배열 깊이를 비교하는 `_.flattenDeep`/`_.flattenDepth`, 복제·비교 함수 `_.cloneDeep`/`_.isEqual`, 시간 흐름을 다루는 `_.debounce`/`_.throttle`은 각각 경로 추적, 충돌 비교, 깊이 레이어, 참조 관계, 이벤트 타임라인에 맞춘 전용 시각화를 제공합니다.
각 lodash 함수는 `/groupBy`, `/map`, `/reduce`처럼 별도 route로 열립니다.

## 실행

```bash
pnpm install --no-frozen-lockfile
pnpm dev
```

브라우저에서 `http://127.0.0.1:3000/groupBy`를 열면 됩니다.
