import React from "react";
import Head from "next/head";

export default function Home() {
  return (
    <>
      <Head>
        <title>Poradas Wedding</title>
        <meta name="description" content="Celebrate the Poradas family wedding!" />
      </Head>
      <main style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ff 100%)",
        animation: "fadeIn 2s"
      }}>
        <h1 style={{
          fontSize: "3rem",
          fontWeight: 700,
          color: "#3b82f6",
          marginBottom: "1rem",
          letterSpacing: "2px",
          textShadow: "0 2px 8px #a5b4fc"
        }}>
          Welcome to the Poradas Wedding
        </h1>
        <p style={{
          fontSize: "1.5rem",
          color: "#6366f1",
          marginBottom: "2rem",
          textAlign: "center",
          maxWidth: "600px"
        }}>
          Join us in celebrating love, family, and new beginnings. Scroll down to explore the story, the event, and all the beautiful moments.
        </p>
        <button style={{
          padding: "1rem 2rem",
          fontSize: "1.25rem",
          borderRadius: "999px",
          background: "linear-gradient(90deg, #6366f1 0%, #3b82f6 100%)",
          color: "#fff",
          border: "none",
          boxShadow: "0 4px 16px #6366f1a0",
          cursor: "pointer",
          transition: "transform 0.2s, box-shadow 0.2s"
        }}
        onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
        onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          Explore the Story
        </button>
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(40px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </main>
    </>
  );
}
