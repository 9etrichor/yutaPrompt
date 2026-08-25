import { ReactNode, useState, useRef, useEffect } from "react";
import { t } from "../i18n";

export type FormatType = "heading" | "bold" | "italic" | "blockquote" | "list_ul" | "list_ol" | "code" | "codeblock" | "hr" | "link" | "table" | "clear";

interface MarkdownToolbarProps {
  onFormat: (type: FormatType, level?: number) => void;
}

function ToolbarButton({
  icon,
  title,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800 active:bg-slate-300 transition-colors focus:outline-none"
      title={title}
      onClick={(e) => {
        // Prevent focus loss from textarea when clicking buttons
        e.preventDefault();
        onClick();
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 -960 960 960"
        fill="currentColor"
        className="w-[20px] h-[20px]"
      >
        {icon}
      </svg>
    </button>
  );
}

const headingIcons: Record<number, string> = {
  1: "M200-280v-400h80v160h160v-160h80v400h-80v-160H280v160h-80Zm480 0v-320h-80v-80h160v400h-80Z",
  2: "M120-280v-400h80v160h160v-160h80v400h-80v-160H200v160h-80Zm400 0v-160q0-33 23.5-56.5T600-520h160v-80H520v-80h240q33 0 56.5 23.5T840-600v80q0 33-23.5 56.5T760-440H600v80h240v80H520Z",
  3: "M120-280v-400h80v160h160v-160h80v400h-80v-160H200v160h-80Zm400 0v-80h240v-80H600v-80h160v-80H520v-80h240q33 0 56.5 23.5T840-600v240q0 33-23.5 56.5T760-280H520Z",
  4: "M120-280v-400h80v160h160v-160h80v400h-80v-160H200v160h-80Zm600 0v-120H520v-280h80v200h120v-200h80v200h80v80h-80v120h-80Z",
  5: "M120-280v-400h80v160h160v-160h80v400h-80v-160H200v160h-80Zm400 0v-80h240v-80H520v-240h320v80H600v80h160q33 0 56.5 23.5T840-440v80q0 33-23.5 56.5T760-280H520Z",
};

function HeadingDropdown({ onFormat }: { onFormat: (level: number) => void }) {
  const [level, setLevel] = useState(1);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const btn = buttonRef.current;
    if (!btn) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      e.stopPropagation();
      if (e.deltaY < 0) {
        setLevel((prev) => Math.max(1, prev - 1));
      } else if (e.deltaY > 0) {
        setLevel((prev) => Math.min(5, prev + 1));
      }
    }

    btn.addEventListener("wheel", handleWheel, { passive: false });
    return () => btn.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div ref={dropdownRef} className="relative flex items-center">
      <button
        ref={buttonRef}
        type="button"
        className="rounded-l pl-1 pr-0.5 py-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800 active:bg-slate-300 transition-colors focus:outline-none flex items-center"
        title={t("fmtHeading")}
        onClick={(e) => {
          e.preventDefault();
          if (e.shiftKey) {
            setLevel(1);
            onFormat(1);
          } else {
            onFormat(level);
          }
        }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 -960 960 960"
          fill="currentColor"
          className="w-[20px] h-[20px]"
        >
          <path d={headingIcons[level] || headingIcons[1]} />
        </svg>
      </button>
      <button
        type="button"
        className="rounded-r pr-0.5 py-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800 active:bg-slate-300 transition-colors focus:outline-none flex items-center"
        onClick={(e) => {
          e.preventDefault();
          setOpen(!open);
        }}
        onMouseDown={(e) => e.preventDefault()}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 -960 960 960"
          fill="currentColor"
          className="w-[16px] h-[16px]"
        >
          <path d="M480-360 280-560h400L480-360Z" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-[110%] left-0 rounded bg-white shadow-lg border border-slate-200 z-10 p-1 flex flex-row gap-1">
          {[1, 2, 3, 4, 5].map((lvl) => (
            <button
              key={lvl}
              type="button"
              className="p-1 rounded text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus:outline-none flex items-center justify-center"
              onClick={(e) => {
                e.preventDefault();
                setLevel(lvl);
                setOpen(false);
                onFormat(lvl);
              }}
              onMouseDown={(e) => e.preventDefault()}
              title={`H${lvl}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 -960 960 960"
                fill="currentColor"
                className="w-[20px] h-[20px]"
              >
                <path d={headingIcons[lvl]} />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function MarkdownToolbar({ onFormat }: MarkdownToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 bg-slate-50/50 px-3 py-1 shadow-sm relative z-10">
      <HeadingDropdown onFormat={(lvl) => onFormat("heading", lvl)} />
      
      <div className="mx-1 h-4 w-px bg-slate-300"></div>

      <ToolbarButton
        icon={<path d="M272-200v-560h221q65 0 120 40t55 111q0 51-23 78.5T602-491q25 11 55.5 41t30.5 90q0 89-65 124.5T501-200H272Zm121-112h104q48 0 58.5-24.5T566-372q0-11-10.5-35.5T494-432H393v120Zm0-228h93q33 0 48-17t15-38q0-24-17-39t-44-15h-95v109Z" />}
        title={t("fmtBold")}
        onClick={() => onFormat("bold")}
      />
      <ToolbarButton
        icon={<path d="M200-200v-100h160l120-360H320v-100h400v100H580L460-300h140v100H200Z" />}
        title={t("fmtItalic")}
        onClick={() => onFormat("italic")}
      />
      <ToolbarButton
        icon={<path d="m228-240 92-160q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 23-5.5 42.5T458-480L320-240h-92Zm360 0 92-160q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 23-5.5 42.5T818-480L680-240h-92ZM362.5-517.5Q380-535 380-560t-17.5-42.5Q345-620 320-620t-42.5 17.5Q260-585 260-560t17.5 42.5Q295-500 320-500t42.5-17.5Zm360 0Q740-535 740-560t-17.5-42.5Q705-620 680-620t-42.5 17.5Q620-585 620-560t17.5 42.5Q655-500 680-500t42.5-17.5ZM680-560Zm-360 0Z" />}
        title={t("fmtBlockquote")}
        onClick={() => onFormat("blockquote")}
      />

      <div className="mx-1 h-4 w-px bg-slate-300"></div>
      
      <ToolbarButton
        icon={<path d="M360-200v-80h480v80H360Zm0-240v-80h480v80H360Zm0-240v-80h480v80H360ZM200-160q-33 0-56.5-23.5T120-240q0-33 23.5-56.5T200-320q33 0 56.5 23.5T280-240q0 33-23.5 56.5T200-160Zm0-240q-33 0-56.5-23.5T120-480q0-33 23.5-56.5T200-560q33 0 56.5 23.5T280-480q0 33-23.5 56.5T200-400Zm-56.5-263.5Q120-687 120-720t23.5-56.5Q167-800 200-800t56.5 23.5Q280-753 280-720t-23.5 56.5Q233-640 200-640t-56.5-23.5Z" />}
        title={t("fmtListUl")}
        onClick={() => onFormat("list_ul")}
      />
      <ToolbarButton
        icon={<path d="M120-80v-60h100v-30h-60v-60h60v-30H120v-60h120q17 0 28.5 11.5T280-280v40q0 17-11.5 28.5T240-200q17 0 28.5 11.5T280-160v40q0 17-11.5 28.5T240-80H120Zm0-280v-110q0-17 11.5-28.5T160-510h60v-30H120v-60h120q17 0 28.5 11.5T280-560v70q0 17-11.5 28.5T240-450h-60v30h100v60H120Zm60-280v-180h-60v-60h120v240h-60Zm180 440v-80h480v80H360Zm0-240v-80h480v80H360Zm0-240v-80h480v80H360Z" />}
        title={t("fmtListOl")}
        onClick={() => onFormat("list_ol")}
      />
      
      <div className="mx-1 h-4 w-px bg-slate-300"></div>
      
      <ToolbarButton
        icon={<path d="M320-240 80-480l240-240 57 57-184 184 183 183-56 56Zm320 0-57-57 184-184-183-183 56-56 240 240-240 240Z" />}
        title={t("fmtCode")}
        onClick={() => onFormat("code")}
      />
      <ToolbarButton
        icon={<path d="M560-160v-80h120q17 0 28.5-11.5T720-280v-80q0-38 22-69t58-44v-14q-36-13-58-44t-22-69v-80q0-17-11.5-28.5T680-720H560v-80h120q50 0 85 35t35 85v80q0 17 11.5 28.5T840-560h40v160h-40q-17 0-28.5 11.5T800-360v80q0 50-35 85t-85 35H560Zm-280 0q-50 0-85-35t-35-85v-80q0-17-11.5-28.5T120-400H80v-160h40q17 0 28.5-11.5T160-600v-80q0-50 35-85t85-35h120v80H280q-17 0-28.5 11.5T240-680v80q0 38-22 69t-58 44v14q36 13 58 44t22 69v80q0 17 11.5 28.5T280-240h120v80H280Z" />}
        title={t("fmtCodeblock")}
        onClick={() => onFormat("codeblock")}
      />
      
      <div className="mx-1 h-4 w-px bg-slate-300"></div>
      
      <ToolbarButton
        icon={<path d="M160-440v-80h640v80H160Z" />}
        title={t("fmtHr")}
        onClick={() => onFormat("hr")}
      />
      <ToolbarButton
        icon={<path d="M760-120H200q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120ZM200-640h560v-120H200v120Zm100 80H200v360h100v-360Zm360 0v360h100v-360H660Zm-80 0H380v360h200v-360Z" />}
        title={t("fmtTable")}
        onClick={() => onFormat("table")}
      />
      <ToolbarButton
        icon={<path d="M440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm200 160v-80h160q50 0 85-35t35-85q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280H520Z" />}
        title={t("fmtLink")}
        onClick={() => onFormat("link")}
      />
      
      <div className="mx-1 h-4 w-px bg-slate-300"></div>
      
      <ToolbarButton
        icon={<path d="m528-546-93-93-121-121h486v120H568l-40 94ZM792-56 460-388l-80 188H249l119-280L56-792l56-56 736 736-56 56Z" />}
        title={t("fmtClear")}
        onClick={() => onFormat("clear")}
      />
    </div>
  );
}
