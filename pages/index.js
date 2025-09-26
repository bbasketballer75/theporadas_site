      <section style={{
        width: "100%",
        maxWidth: "800px",
        margin: "4rem auto 0 auto",
        padding: "2.5rem 2rem",
        background: "linear-gradient(135deg, #e9f5ec 0%, #fbeaea 100%)",
        borderRadius: "32px",
        boxShadow: "0 8px 32px #7ca98240",
        textAlign: "center"
      }}>
        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "2.5rem",
          color: "#d8a7b1",
          marginBottom: "1.5rem"
        }}>
          Event Details
        </h2>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.5rem"
        }}>
          <div style={{
            fontFamily: "'Lora', serif",
            fontSize: "1.25rem",
            color: "#7ca982",
            background: "#fbeaea",
            borderRadius: "16px",
            padding: "1.5rem",
            minWidth: "220px",
            boxShadow: "0 2px 12px #d8a7b130"
          }}>
            <strong>Date:</strong> June 14, 2025<br />
            <strong>Time:</strong> 4:00 PM<br />
            <strong>Venue:</strong> Willow Creek Gardens, Austin, TX
          </div>
          <div style={{
            marginTop: "1rem",
            width: "100%",
            maxWidth: "600px",
            borderRadius: "16px",
            overflow: "hidden",
            boxShadow: "0 2px 12px #7ca98230"
          }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d11000.000000000001!2d-97.7431!3d30.2672!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8644b5a3e6b6b6b7%3A0x7ca982d8a7b1!2sWillow%20Creek%20Gardens!5e0!3m2!1sen!2sus!4v1680000000000!5m2!1sen!2sus"
              width="100%"
              height="250"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Venue Map"
            ></iframe>
          </div>
        </div>
      </section>

import React from "react";

export default function Home() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(120deg, #e9f5ec 0%, #d8a7b1 60%, #fbeaea 100%)",
      animation: "fadeIn 2s"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "700px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: "1.5rem"
      }}>
        <img src="https://cdn.pixabay.com/photo/2017/01/06/19/15/rose-1956287_1280.png" alt="Floral accent" style={{
          width: "80px",
          height: "80px",
          marginRight: "1.5rem",
          filter: "grayscale(0.2) opacity(0.8)"
        }} />
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "3.5rem",
          fontWeight: 700,
          color: "#7ca982",
          letterSpacing: "2px",
          textShadow: "0 2px 12px #c7e1d3"
        }}>
          Austin & Jordyn's Wedding
        </h1>
        <img src="https://cdn.pixabay.com/photo/2017/01/06/19/15/rose-1956287_1280.png" alt="Floral accent" style={{
          width: "80px",
          height: "80px",
          marginLeft: "1.5rem",
          filter: "grayscale(0.2) opacity(0.8)"
        }} />
      </div>
      <p style={{
        fontFamily: "'Lora', serif",
        fontSize: "1.5rem",
        color: "#7ca982",
        marginBottom: "2rem",
        textAlign: "center",
        maxWidth: "600px",
        background: "rgba(216, 167, 177, 0.15)",
        borderRadius: "16px",
        padding: "1rem 2rem",
        boxShadow: "0 2px 12px #d8a7b120"
      }}>
        <span style={{ color: "#d8a7b1", fontWeight: 600, fontSize: "1.7rem" }}>Sage Green</span> & <span style={{ color: "#7ca982", fontWeight: 600, fontSize: "1.7rem" }}>Blush</span> Wedding<br />
        <span style={{ color: "#7ca982", fontWeight: 500 }}>Celebrating love, family, and new beginnings.</span>
      </p>
      <button style={{
        padding: "1rem 2.5rem",
        fontSize: "1.25rem",
        borderRadius: "999px",
        background: "linear-gradient(90deg, #d8a7b1 0%, #7ca982 100%)",
        color: "#fff",
        border: "none",
        boxShadow: "0 4px 16px #d8a7b180",
        cursor: "pointer",
        fontFamily: "'Lora', serif",
        fontWeight: 600,
        letterSpacing: "1px",
        transition: "transform 0.2s, box-shadow 0.2s"
      }}
      onMouseEnter={e => e.currentTarget.style.transform = "scale(1.08)"}
      onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
      >
        Explore Our Story
      </button>
      <div style={{
        marginTop: "3rem",
        width: "100%",
        maxWidth: "700px",
        borderRadius: "24px",
        background: "rgba(255,255,255,0.7)",
        boxShadow: "0 8px 32px #d8a7b140",
        padding: "2rem",
        textAlign: "center"
      }}>
        <span style={{
          fontFamily: "'Lora', serif",
          fontSize: "1.1rem",
          color: "#7ca982"
        }}>
          "Two hearts, one love, forever intertwined."
        </span>
      </div>

      <section style={{
        width: "100%",
        maxWidth: "800px",
        margin: "4rem auto 0 auto",
        padding: "2.5rem 2rem",
        background: "linear-gradient(135deg, #fbeaea 0%, #e9f5ec 100%)",
        borderRadius: "32px",
        boxShadow: "0 8px 32px #d8a7b140",
        textAlign: "center"
      }}>
        <h2 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "2.5rem",
          color: "#7ca982",
          marginBottom: "1.5rem"
        }}>
          Our Story
        </h2>
        <p style={{
          fontFamily: "'Lora', serif",
          fontSize: "1.25rem",
          color: "#d8a7b1",
          marginBottom: "1.5rem"
        }}>
          From a serendipitous meeting to a lifetime of love, Austin and Jordyn’s journey has been filled with laughter, adventure, and cherished moments. Together, we celebrate the beginning of our forever.
        </p>
        <div style={{
          display: "flex",
          justifyContent: "center",
          gap: "2rem",
          flexWrap: "wrap"
        }}>
          <div style={{
            background: "#e9f5ec",
            borderRadius: "16px",
            padding: "1.5rem",
            minWidth: "220px",
            boxShadow: "0 2px 12px #7ca98230"
          }}>
            <span style={{
              fontFamily: "'Lora', serif",
              color: "#7ca982",
              fontWeight: 600,
              fontSize: "1.1rem"
            }}>First Date</span>
            <br />
            <span style={{ color: "#888" }}>May 2018</span>
          </div>
          <div style={{
            background: "#fbeaea",
            borderRadius: "16px",
            padding: "1.5rem",
            minWidth: "220px",
            boxShadow: "0 2px 12px #d8a7b130"
          }}>
            <span style={{
              fontFamily: "'Lora', serif",
              color: "#d8a7b1",
              fontWeight: 600,
              fontSize: "1.1rem"
            }}>Engagement</span>
            <br />
            <span style={{ color: "#888" }}>October 2023</span>
          </div>
          <div style={{
            background: "#e9f5ec",
            borderRadius: "16px",
            padding: "1.5rem",
            minWidth: "220px",
            boxShadow: "0 2px 12px #7ca98230"
          }}>
            <span style={{
              fontFamily: "'Lora', serif",
              color: "#7ca982",
              fontWeight: 600,
              fontSize: "1.1rem"
            }}>Wedding Day</span>
            <br />
            <span style={{ color: "#888" }}>June 2025</span>
          </div>
        </div>
      </section>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600&family=Playfair+Display:wght@700&display=swap');
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </main>
  );
}
