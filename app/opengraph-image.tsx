import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#0F1210",
        color: "#E8EAE4",
        padding: "56px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 18% -12%, rgba(196,222,42,0.24), rgba(15,18,16,0) 44%)",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#161A17",
            border: "1px solid #2E342C",
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 64 64"
            xmlns="http://www.w3.org/2000/svg"
          >
            <ellipse
              cx="32"
              cy="29"
              rx="15"
              ry="9.5"
              fill="none"
              stroke="#C4DE2A"
              strokeWidth="2"
            />
            <circle cx="32" cy="29" r="5" fill="#C4DE2A" opacity="0.15" />
            <circle
              cx="32"
              cy="29"
              r="5"
              fill="none"
              stroke="#C4DE2A"
              strokeWidth="1.5"
            />
            <circle cx="32" cy="29" r="2" fill="#C4DE2A" />
            <line
              x1="43"
              y1="38"
              x2="49"
              y2="44"
              stroke="#C4DE2A"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <line
              x1="46"
              y1="41"
              x2="51"
              y2="41"
              stroke="#C4DE2A"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="46"
              y1="41"
              x2="46"
              y2="46"
              stroke="#C4DE2A"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: -0.8,
              lineHeight: 1,
            }}
          >
            TruthLayer
          </span>
          <span
            style={{
              marginTop: 8,
              fontSize: 18,
              color: "#A8ABA2",
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            Editorial AI Verification
          </span>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <span
          style={{
            fontSize: 68,
            lineHeight: 1.08,
            maxWidth: 980,
            fontWeight: 700,
            letterSpacing: -1.8,
          }}
        >
          See what the article is really saying.
        </span>
        <span
          style={{
            marginTop: 20,
            fontSize: 30,
            color: "#A8ABA2",
          }}
        >
          Claim mapping, evidence graph, and manipulation scoring.
        </span>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
