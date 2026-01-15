"use client";
import { useReducer, useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarDays } from "lucide-react";

function modalReducer(state: { showCalendar: boolean }, action: { type: string }) {
  switch (action.type) {
    case "OPEN_CALENDAR":
      return { ...state, showCalendar: true };
    case "CLOSE_CALENDAR":
      return { ...state, showCalendar: false };
    default:
      return state;
  }
}

const timeSlots = {
  Morning: ["10:00 am", "10:15 am", "10:30 am", "10:45 am", "11:00 am", "11:15 am", "11:30 am", "11:45 am"],
  Afternoon: ["12:00 pm", "12:15 pm", "12:30 pm", "12:45 pm", "1:00 pm", "1:15 pm", "1:30 pm", "1:45 pm"],
  Evening: ["5:00 pm", "5:15 pm", "5:30 pm", "5:45 pm", "6:00 pm", "6:15 pm", "6:30 pm", "6:45 pm"],
};

export default function ServiceDateSelector({ onChange, allowedTabs }: { onChange?: (s: { date?: string | null; time?: string | null }) => void, allowedTabs?: ('Morning'|'Afternoon'|'Evening')[] }) {
  const [state, dispatch] = useReducer(modalReducer, { showCalendar: false });
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // ISO date: YYYY-MM-DD
  const defaultTab: 'Morning'|'Afternoon'|'Evening' = (allowedTabs && allowedTabs.length>0) ? allowedTabs[0] : 'Morning'
  const [selectedTab, setSelectedTab] = useState<'Morning' | 'Afternoon' | 'Evening'>(defaultTab);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const handleDateSelect = (isoDate: string) => {
    setSelectedDate(isoDate);
    dispatch({ type: "CLOSE_CALENDAR" });
    if (onChange) onChange({ date: isoDate, time: selectedTime });
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    if (onChange) onChange({ date: selectedDate, time });
  }

  return (
    <>
      <section className="max-w-3xl mx-auto mb-8 bg-muted rounded-xl shadow p-6">
        <div className="text-2xl font-semibold mb-2">Date</div>
        {selectedDate ? (
          <>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1">
                <div className="border rounded-lg bg-muted px-4 py-3 flex items-center text-lg font-medium">
                  <CalendarDays className="w-5 h-5 mr-2 text-muted-foreground" />
                  <div className="flex-1">
                    {(() => {
                      try {
                        const parts = String(selectedDate).split('-')
                        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
                        return d.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
                      } catch {
                        return selectedDate
                      }
                    })()}
                  </div>
                  <button
                    aria-label="Change date"
                    className="ml-3 text-sm text-primary hover:underline"
                    onClick={() => dispatch({ type: 'OPEN_CALENDAR' })}
                  >
                    Change
                  </button>
                </div>
              </div>
            </div>
            <div className="text-muted-foreground text-base mb-2">Choose a time that suits you</div>
            <div className="flex rounded-full overflow-hidden bg-[#ececec] mb-4">
              {(allowedTabs && allowedTabs.length>0 ? allowedTabs : (["Morning", "Afternoon", "Evening"] as const)).map((tab) => (
                <button
                  key={tab}
                  className={`flex-1 py-3 px-2  text-lg font-medium transition ${selectedTab === tab ? "bg-muted  shadow" : "text-muted-foreground"}`}
                  onClick={() => setSelectedTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
                {timeSlots[selectedTab].map((slot) => (
                  <button
                    key={slot}
                    className={`rounded-full border px-6 py-2 text-base font-medium hover:text-white transition-all ${selectedTime === slot ? "bg-[#333] text-white" : "bg-background hover:bg-[#222]"}`}
                    onClick={() => handleTimeSelect(slot)}
                  >
                    {slot}
                  </button>
                ))}
              </div>
              {selectedTime && (
                <div className="flex items-center gap-3">
                  <div className="text-sm text-muted-foreground">Selected time: <strong className="text-base text-black">{selectedTime}</strong></div>
                  <button
                    className="text-sm text-primary hover:underline"
                    onClick={() => {
                      setSelectedTime(null)
                      if (onChange) onChange({ date: selectedDate, time: null })
                    }}
                  >
                    Change time
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <Button className="bg-[#222] text-white text-lg font-semibold rounded-full px-8 py-3 shadow-md hover:bg-[#111] transition-all" onClick={() => dispatch({ type: "OPEN_CALENDAR" })}>
            Select preferred date
          </Button>
        )}
      </section>
      {/* Calendar Popup */}
      {state.showCalendar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white dark:bg-slate-100 rounded-2xl shadow-xl p-8 max-w-3xl w-full relative">
            <button className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition" onClick={() => dispatch({ type: "CLOSE_CALENDAR" })}>
              <span className="text-2xl font-bold">×</span>
            </button>
            <div className="flex flex-col items-center">
              <div className="flex gap-16">
                {(() => {
                  const today = new Date();
                  today.setHours(0,0,0,0);

                  const months: Date[] = [];
                  const firstMonth = new Date();
                  firstMonth.setDate(1);
                  firstMonth.setHours(0,0,0,0);
                  months.push(firstMonth);
                  const secondMonth = new Date(firstMonth.getFullYear(), firstMonth.getMonth()+1, 1);
                  secondMonth.setHours(0,0,0,0);
                  months.push(secondMonth);

                  const pad = (n: number) => String(n).padStart(2, '0')
                  const toLocalISO = (dateObj: Date) => `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`

                  const monthTables = months.map((m) => {
                    const year = m.getFullYear();
                    const monthIndex = m.getMonth();
                    const monthName = m.toLocaleString(undefined, { month: 'long' });
                    const firstWeekday = new Date(year, monthIndex, 1).getDay();
                    const daysInMonth = new Date(year, monthIndex+1, 0).getDate();

                    const weeks: (number | null)[][] = [];
                    let week: (number | null)[] = new Array(7).fill(null);
                    let day = 1;

                    while (day <= daysInMonth) {
                      for (let i = 0; i < 7; i++) {
                        if (weeks.length === 0 && i < firstWeekday && day === 1) {
                          week[i] = null;
                          continue;
                        }
                        if (day <= daysInMonth) {
                          week[i] = day;
                          day++;
                        } else {
                          week[i] = null;
                        }
                      }
                      weeks.push(week);
                      week = new Array(7).fill(null);
                    }

                    while (weeks.length < 5) weeks.push(new Array(7).fill(null));

                    const formatOrdinal = (n: number) => {
                      const s = ['th','st','nd','rd'];
                      const v = n % 100;
                      return n + (s[(v-20)%10] || s[v] || s[0]);
                    }

                    const formatLabel = (dateObj: Date) => {
                      const weekday = dateObj.toLocaleString(undefined, { weekday: 'short' });
                      const monthLabel = dateObj.toLocaleString(undefined, { month: 'long' });
                      return `${weekday}, ${monthLabel} ${formatOrdinal(dateObj.getDate())}, ${dateObj.getFullYear()}`;
                    }

                    return (
                      <div key={`${year}-${monthIndex}`}>
                        <div className="text-2xl font-semibold mb-2 text-center">{monthName} {year}</div>
                        <table className="w-full text-center mb-4">
                          <thead>
                            <tr className="text-muted-foreground">
                              <th className="px-3">Su</th><th className="px-3">Mo</th><th className="px-3">Tu</th><th className="px-3">We</th><th className="px-3">Th</th><th className="px-3">Fr</th><th className="px-3">Sa</th>
                            </tr>
                          </thead>
                          <tbody className="text-lg">
                            {weeks.map((w, wi) => (
                              <tr key={wi}>
                                {w.map((d, di) => {
                                  if (d === null) return <td key={di} className="px-3 calendar-day"></td>;
                                  const cellDate = new Date(year, monthIndex, d);
                                  cellDate.setHours(0,0,0,0);
                                  const iso = toLocalISO(cellDate);
                                  const isEnabled = cellDate.getTime() >= today.getTime();
                                  const isToday = iso === toLocalISO(today);

                                  if (!isEnabled) {
                                    return <td key={di} className="px-3 calendar-day disabled">{d}</td>;
                                  }

                                  if (isToday) {
                                    return <td key={di} className="px-3"><span className="inline-block w-8 h-8 rounded-full bg-muted text-black" onClick={() => handleDateSelect(iso)}>{d}</span></td>;
                                  }

                                  return <td key={di} className="px-3 calendar-day" onClick={() => handleDateSelect(iso)}>{d}</td>;
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  });

                  return monthTables;
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
      <style jsx>{`
        .calendar-day {
          transition: background 0.2s, color 0.2s;
          border-radius: 9999px;
          cursor: pointer;
        }
        .calendar-day:hover {
          background: #333;
          color: #fff;
        }
        .calendar-day.disabled {
          color: #9ca3af; /* muted gray */
          cursor: default;
        }
        .calendar-day.disabled:hover {
          background: transparent;
          color: #9ca3af;
        }
      `}</style>
    </>
  );
}
