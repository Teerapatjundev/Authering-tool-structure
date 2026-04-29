"use client";

export function ControlsPanel() {
  const controlItems = [
    {
      id: "submit-button",
      title: "Submit button",
      description: "ปุ่มส่งคำตอบ",
    },
    {
      id: "restart-button",
      title: "Restart button",
      description: "ปุ่มเริ่มใหม่",
    },
    {
      id: "timer",
      title: "Timer",
      description: "ตัวจับเวลา",
    },
    {
      id: "next-button",
      title: "Next button",
      description: "ปุ่มถัดไป",
    },
  ];

  return (
    <div className="flex-1 p-3 overflow-auto">
      <div className="text-sm font-semibold text-gray-800">
        เลือกคอนโทรลสำหรับแบบฝึกหัด
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        {controlItems.map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/practice-type", item.id);
              e.dataTransfer.setData("application/practice-title", item.title);
              e.dataTransfer.setData(
                "application/practice-description",
                item.description,
              );
              e.dataTransfer.effectAllowed = "copy";

              // Exercise control buttons should follow the cursor with the same look as on canvas.
              if (
                item.id === "submit-button" ||
                item.id === "next-button" ||
                item.id === "restart-button"
              ) {
                const labelByControlId: Record<string, string> = {
                  "submit-button": "ตรวจคำตอบ",
                  "next-button": "ถัดไป",
                  "restart-button": "เริ่มใหม่",
                };
                const ghost = document.createElement("canvas");
                const dpr = window.devicePixelRatio || 1;
                const ghostWidth = 220;
                const ghostHeight = 64;
                const radius = 14;

                ghost.width = ghostWidth * dpr;
                ghost.height = ghostHeight * dpr;
                ghost.style.width = `${ghostWidth}px`;
                ghost.style.height = `${ghostHeight}px`;

                const ctx = ghost.getContext("2d");
                if (ctx) {
                  ctx.scale(dpr, dpr);
                  ctx.globalAlpha = 0.88;
                  ctx.fillStyle = "#F41221";

                  ctx.beginPath();
                  ctx.moveTo(radius, 0);
                  ctx.lineTo(ghostWidth - radius, 0);
                  ctx.quadraticCurveTo(ghostWidth, 0, ghostWidth, radius);
                  ctx.lineTo(ghostWidth, ghostHeight - radius);
                  ctx.quadraticCurveTo(
                    ghostWidth,
                    ghostHeight,
                    ghostWidth - radius,
                    ghostHeight,
                  );
                  ctx.lineTo(radius, ghostHeight);
                  ctx.quadraticCurveTo(0, ghostHeight, 0, ghostHeight - radius);
                  ctx.lineTo(0, radius);
                  ctx.quadraticCurveTo(0, 0, radius, 0);
                  ctx.closePath();
                  ctx.fill();

                  ctx.fillStyle = "#FFFFFF";
                  ctx.font = "bold 30px Arial";
                  ctx.textAlign = "center";
                  ctx.textBaseline = "middle";
                  ctx.fillText(
                    labelByControlId[item.id] ?? item.title,
                    ghostWidth / 2,
                    ghostHeight / 2,
                  );
                }

                ghost.style.position = "absolute";
                ghost.style.top = "-9999px";
                document.body.appendChild(ghost);
                e.dataTransfer.setDragImage(
                  ghost,
                  ghostWidth / 2,
                  ghostHeight / 2,
                );
                requestAnimationFrame(() => {
                  document.body.removeChild(ghost);
                });
                return;
              }

              const ghostElement = e.currentTarget.cloneNode(true) as HTMLElement;
              ghostElement.style.opacity = "0.5";
              ghostElement.style.position = "absolute";
              ghostElement.style.top = "-1000px";
              document.body.appendChild(ghostElement);
              e.dataTransfer.setDragImage(ghostElement, 0, 0);
              setTimeout(() => document.body.removeChild(ghostElement), 0);
            }}
            className="p-3 transition-colors bg-white border border-gray-200 rounded-lg cursor-move active:cursor-grabbing hover:bg-gray-50"
          >
            <div className="flex flex-col gap-2 text-center">
              <div className="w-full px-1">
                <div className="w-full mx-auto bg-gray-200 border border-gray-300 rounded-sm aspect-square" />
              </div>
              <div className="text-sm font-medium text-gray-800">{item.title}</div>
            </div>
            <div className="mt-1 text-xs text-center text-gray-500">
              {item.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}