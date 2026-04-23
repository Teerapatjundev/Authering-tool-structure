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