import "@xyflow/react/dist/style.css";
import "../styles.css";

export const metadata = {
  title: "Lodash Visualizer",
  description: "Interactive lodash data-flow visualizer"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
