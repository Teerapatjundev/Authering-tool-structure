"use client";

export function PracticePanel() {
  const practiceTypes = [
    {
      id: "choice",
      title: "Choice",
      description: "แบบฝึกหัดข้อคำถาม",
    },
    {
      id: "short-answer",
      title: "Short answer",
      description: "คำตอบแบบสั้น",
    },
    {
      id: "fill-in-the-blank",
      title: "Fill in the blank",
      description: "เติมคำลงในช่องว่าง",
    },
    {
      id: "essay-paragraph",
      title: "Essay/Paragraph",
      description: "เรียงความ/ย่อหน้า",
    },
    {
      id: "connection",
      title: "Connection",
      description: "โยงเส้นจับคู่",
    },
    {
      id: "sequence-ordering",
      title: "Sequence/Ordering",
      description: "เรียงลำดับข้อมูล",
    },
    {
      id: "text-identification",
      title: "Text Identification",
      description: "รูปแบบแบบฝึกหัด",
    },
    {
      id: "image-identification",
      title: "Image Identification",
      description: "เลือกรูปที่ถูกต้อง",
    },
  ];

  const renderTitle = (title: string) => {
    const parts = title.split("/").map((p) => p.trim()).filter(Boolean);
    if (parts.length <= 1) return title;
    return (
      <>
        {parts.map((p, i) => (
          <span key={`${p}-${i}`}>
            {p}
            {i < parts.length - 1 ? <br /> : null}
          </span>
        ))}
      </>
    );
  };

  return (
    <div className="flex-1 p-3 overflow-auto">
      <div className="text-sm font-semibold text-gray-800">
        เลือกรูปแบบของแบบฝึกหัด
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        {practiceTypes.map((t) => (
          <div
            key={t.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/practice-type", t.id);
              e.dataTransfer.setData("application/practice-title", t.title);
              e.dataTransfer.setData(
                "application/practice-description",
                t.description,
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
              <div className="text-sm font-medium text-gray-800">
                {renderTitle(t.title)}
              </div>
            </div>
            <div className="mt-1 text-xs text-center text-gray-500">
              {t.description}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
