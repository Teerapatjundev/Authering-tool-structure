"use client";

import { ArrowLeftOutlined } from "@ant-design/icons";
import { Button, Space } from "antd";
import { useDocStore } from "../stores/docStore";

const buttonStyle = {
  border: "2px solid white",
  color: "white",
  backgroundColor: "transparent",
  fontSize: "18px",
  width: "120px",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "4px",
  cursor: "pointer",
};

export function Navbar() {
  const handleBack = () => {
    window.location.href = "/dashboard";
  };
  const { doc } = useDocStore();

  return (
    <header
      style={{
        padding: "0rem 1.5rem",
        lineHeight: "18px",
        justifyContent: "space-between",
        display: "flex",
        alignItems: "center",
        backgroundColor: "#ED1C24",
        boxShadow: "0px 2px 10px 0px #2E2F3840",
        height: "60px",
      }}
      className="aksorn-font"
    >
      <Space size="large">
        <ArrowLeftOutlined
          style={{ color: "white", cursor: "pointer" }}
          onClick={handleBack}
        />
        <h1 className="font-medium text-white max-w-[200px] truncate">
          {doc?.title || "-"}
        </h1>
      </Space>

      <Space size="middle">
        <Button style={buttonStyle}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15.1576 6.7081L2.58579 0.20524C1.56433 -0.322864 0 0.189616 0 1.49581V14.4984C0 15.6702 1.45361 16.3765 2.58579 15.789L15.1576 9.28925C16.279 8.71115 16.2826 7.2862 15.1576 6.7081Z"
              fill="white"
            />
          </svg>
          พรีวิว
        </Button>
        <Button style={buttonStyle}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 5.55556V16.2222C18 16.7111 17.8259 17.1296 17.4778 17.4778C17.1296 17.8259 16.7111 18 16.2222 18H3.77778C3.28889 18 2.87037 17.8259 2.52222 17.4778C2.17407 17.1296 2 16.7111 2 16.2222V3.77778C2 3.28889 2.17407 2.87037 2.52222 2.52222C2.87037 2.17407 3.28889 2 3.77778 2H14.4444L18 5.55556ZM16.2222 6.31111L13.6889 3.77778H3.77778V16.2222H16.2222V6.31111ZM11.8889 14.5556C12.4074 14.037 12.6667 13.4074 12.6667 12.6667C12.6667 11.9259 12.4074 11.2963 11.8889 10.7778C11.3704 10.2593 10.7407 10 10 10C9.25926 10 8.62963 10.2593 8.11111 10.7778C7.59259 11.2963 7.33333 11.9259 7.33333 12.6667C7.33333 13.4074 7.59259 14.037 8.11111 14.5556C8.62963 15.0741 9.25926 15.3333 10 15.3333C10.7407 15.3333 11.3704 15.0741 11.8889 14.5556ZM4.66667 8.22222H12.6667V4.66667H4.66667V8.22222ZM3.77778 6.31111V16.2222V3.77778V6.31111Z"
              fill="white"
            />
          </svg>
          บันทึก
        </Button>
      </Space>
    </header>
  );
}
