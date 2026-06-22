import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, PhoneCall } from "lucide-react";

type ProfileRole = "telecaller" | "marketing_manager" | "counselor";

export interface RoleProfileData {
  id: string;
  role: ProfileRole;
  name: string;
  designation: string;
  employeeCode: string;
  location: string;
  profileCompletion: number;
  resumeStatus: string;
  resumeUpdated: boolean;
  avatarUrl?: string;
}

interface RoleProfileSectionProps {
  profile: RoleProfileData | null;
  tasks: {
    id: string;
    type: "Call" | "Follow-up" | "Upcoming Follow-up";
    date: string;
    title: string;
    time?: string;
  }[];
}

export function RoleProfileSection({ profile: _profile, tasks }: RoleProfileSectionProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [monthCursor, setMonthCursor] = useState<Date>(new Date());
  const [moreModalOpen, setMoreModalOpen] = useState(false);
  const [moreModalDate, setMoreModalDate] = useState<string>("");
  const [moreModalTasks, setMoreModalTasks] = useState<RoleProfileSectionProps["tasks"]>([]);

  const selectedDateKey = useMemo(() => {
    if (!selectedDate) return "";
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const d = String(selectedDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [selectedDate]);

  const tasksForSelectedDate = useMemo(
    () => tasks.filter((t) => t.date === selectedDateKey),
    [tasks, selectedDateKey],
  );

  const calendarCells = useMemo(() => {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startDay = firstDayOfMonth.getDay();
    const gridStart = new Date(year, month, 1 - startDay);

    return Array.from({ length: 42 }, (_, idx) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + idx);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${d}`;
      return {
        date,
        key,
        inMonth: date.getMonth() === month,
        isToday: key === new Date().toISOString().split("T")[0],
        dayTasks: tasks.filter((t) => t.date === key),
      };
    });
  }, [monthCursor, tasks]);

  const monthLabel = useMemo(
    () => monthCursor.toLocaleString("en-US", { month: "long", year: "numeric" }),
    [monthCursor],
  );

  return (
    <>
      <section className="w-full rounded-xl border bg-card p-4 shadow-card">
        <h3 className="mb-3 text-sm font-semibold text-card-foreground">My Call Calendar</h3>
        <div className="mb-3 flex flex-wrap items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm bg-blue-500" /> Calls
          </span>
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm bg-violet-500" /> Follow-ups
          </span>
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Upcoming Follow-ups
          </span>
        </div>

        <div className="rounded-lg border">
          <div className="flex items-center justify-between border-b bg-muted/30 px-3 py-2">
            <button
              type="button"
              onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}
              className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1));
              }}
              className="text-xs font-semibold text-primary"
            >
              Today
            </button>
            <p className="text-sm font-semibold text-card-foreground">{monthLabel}</p>
            <button
              type="button"
              onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}
              className="rounded-md border px-2 py-1 text-xs hover:bg-muted"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-7 border-b bg-indigo-500 text-center text-[11px] font-semibold text-white">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="border-r border-indigo-300 py-2 last:border-r-0">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarCells.map((cell) => (
              <button
                key={cell.key}
                type="button"
                onClick={() => setSelectedDate(cell.date)}
                className={`min-h-[88px] border-r border-b p-1.5 text-left align-top transition hover:bg-muted/40 ${
                  selectedDateKey === cell.key ? "bg-sky-50" : ""
                } ${!cell.inMonth ? "bg-muted/20" : "bg-background"}`}
              >
                <p className={`text-xs font-semibold ${cell.inMonth ? "text-slate-700" : "text-slate-400"} ${cell.isToday ? "text-primary" : ""}`}>
                  {cell.date.getDate()}
                </p>
                <div className="mt-1 space-y-1">
                  {cell.dayTasks.slice(0, 2).map((task) => (
                    <div
                      key={task.id}
                      className={`truncate rounded px-1.5 py-0.5 text-[10px] text-white ${
                        task.type === "Call"
                          ? "bg-blue-500"
                          : task.type === "Upcoming Follow-up"
                            ? "bg-emerald-500"
                            : "bg-violet-500"
                      }`}
                    >
                      {task.title}
                    </div>
                  ))}
                  {cell.dayTasks.length > 2 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMoreModalDate(cell.key);
                        setMoreModalTasks(cell.dayTasks);
                        setMoreModalOpen(true);
                      }}
                      className="text-[10px] font-medium text-slate-600 hover:underline"
                    >
                      +{cell.dayTasks.length - 2} more
                    </button>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Tasks for {selectedDateKey || "selected date"}</p>
          {tasksForSelectedDate.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              No callings or follow-up calls for this date.
            </p>
          ) : (
            tasksForSelectedDate.map((task) => (
              <div key={task.id} className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-card-foreground">{task.title}</p>
                  <Badge variant="outline">{task.type}</Badge>
                </div>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <PhoneCall className="h-3.5 w-3.5" />
                  {task.time ? `${task.date} ${task.time}` : task.date}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <Dialog open={moreModalOpen} onOpenChange={setMoreModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {moreModalDate
                ? new Date(`${moreModalDate}T00:00:00`).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "2-digit",
                  })
                : "Leads"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-1.5 overflow-y-auto pr-1 max-h-[60vh]">
            {moreModalTasks.map((task) => (
              <div
                key={task.id}
                className={`rounded px-2.5 py-1.5 text-sm text-white ${
                  task.type === "Call"
                    ? "bg-blue-500"
                    : task.type === "Upcoming Follow-up"
                      ? "bg-emerald-500"
                      : "bg-violet-500"
                }`}
              >
                {task.title}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
