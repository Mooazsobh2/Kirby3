import { useEffect, useMemo, useState } from "react";

/** أنواع الحالة الخاصة بمواعيد Tell Market */
type ApptStatus =
  | "scheduled"       // تم جدولة الموعد من Tell Market
  | "confirm_pending" // داخل نافذة 30 دقيقة بانتظار تأكيد
  | "confirmed"       // تم التأكيد
  | "cancelled"       // أُلغي
  | "visited";        // تمت الزيارة (سواء بيع أو لا)

type Appointment = {
  id: string;
  customer: string;
  area: string;
  branch: string;               // الفرع
  secretaryName: string;        // اسم السكرتيرة
  date: string;                 // YYYY-MM-DD
  time: string;                 // HH:mm (24h)
  status: ApptStatus;
  confirmedAt?: string;         // وقت/تاريخ التأكيد
  cancelReason?: string;        // سبب الإلغاء (لو أُلغي)
  saleMade?: boolean | null;    // هل تم البيع؟
  referrals?: number | null;    // عدد التوصيات
};

/** دوال مساعدة للتواريخ */
function toDateTime(date: string, time: string) {
  // يُنشئ Date محلي من تاريخ + وقت بنمط YYYY-MM-DD + HH:mm
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const dt = new Date();
  dt.setFullYear(y, (m || 1) - 1, d || 1);
  dt.setHours(hh || 0, mm || 0, 0, 0);
  return dt;
}
function nowYMDHM() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function diffMinutes(a: Date, b: Date) {
  return Math.round((a.getTime() - b.getTime()) / 60000);
}

/** تخزين محلي عام */
function useLocalStorage<T>(key: string, initial: T): [T, (u: ((p: T) => T) | T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const v = localStorage.getItem(key);
      return v ? (JSON.parse(v) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  const update = (u: any) => setValue((prev: any) => (typeof u === "function" ? u(prev) : u));
  return [value, update];
}

/** بيانات أولية توضيحية */
const initialAppointments: Appointment[] = [
  {
    id: "TM-1001",
    customer: "محمد القحطاني",
    area: "السويدي",
    branch: "فرع السويدي",
    secretaryName: "نورة",
    date: "2025-11-09",
    time: "15:30",
    status: "scheduled",
  },
  {
    id: "TM-1002",
    customer: "أحمد علي",
    area: "ظهرة لبن",
    branch: "فرع لبن",
    secretaryName: "مها",
    date: "2025-11-09",
    time: "11:45",
    status: "scheduled",
  },
  {
    id: "TM-1003",
    customer: "رغد سعد الدين",
    area: "جرمانا",
    branch: "فرع جرمانا",
    secretaryName: "ريم",
    date: "2025-11-10",
    time: "19:00",
    status: "scheduled",
  },
];

export default function EngineerAppointments() {
  const [tab, setTab] = useState<"home" | "appointments" | "profile">("appointments");
  const [appts, setAppts] = useLocalStorage<Appointment[]>("tellMarketAppointments", initialAppointments);
  const [selected, setSelected] = useState<string | null>(null);

  // ساعة النظام (لتمكين العدّ التنازلي)
  const [tick, setTick] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 30 * 1000); // كل 30 ثانية
    return () => clearInterval(t);
  }, []);

  // تحديث حالة "confirm_pending" تلقائيًا عندما ندخل نافذة 30 دقيقة
  useEffect(() => {
    const now = new Date();
    setAppts((prev) =>
      prev.map((a) => {
        if (a.status !== "scheduled") return a;
        const start = toDateTime(a.date, a.time);
        const minsToStart = diffMinutes(start, now);
        if (minsToStart <= 30 && minsToStart >= 0) {
          return { ...a, status: "confirm_pending" };
        }
        return a;
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  const open = (id: string) => setSelected(id);
  const close = () => setSelected(null);

  const selectedAppt = useMemo(() => appts.find((a) => a.id === selected) || null, [appts, selected]);

  return (
    <div className="min-h-screen bg-white flex flex-col text-gray-900">
      {/* Header */}
      <header className="p-4 border-b flex items-center justify-between">
        <h1 className="text-lg font-semibold text-red-800">تطبيق المهندس</h1>
        <nav className="flex gap-1">
          {[
            { k: "appointments", l: "المواعيد", i: "📋" },
            { k: "home", l: "الرئيسية", i: "🏠" },
            { k: "profile", l: "الملف", i: "👤" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k as any)}
              className={`px-3 py-1.5 rounded-2xl text-sm ${tab === (t.k as any) ? "bg-red-50 text-red-800" : "border text-gray-600"}`}
            >
              <span className="mr-1">{t.i}</span>
              {t.l}
            </button>
          ))}
        </nav>
      </header>

      {/* Body */}
      <div className="flex-1 p-4">
        {tab === "appointments" && (
          <AppointmentsList
            appts={appts}
            setAppts={setAppts}
            onOpen={open}
          />
        )}

        {tab === "home" && (
          <div className="p-4 border rounded-2xl">
            <h3 className="font-semibold text-red-800 mb-2">مرحبًا 👋</h3>
            <div className="text-sm text-gray-600">هنا ستجد مواعيد Tell Market المعتمدة من المبيعات، مع تأكيد قبل 30 دقيقة، وإدارة البيع/عدم البيع، وعدد التوصيات، وحالات الإلغاء مع السبب.</div>
          </div>
        )}

        {tab === "profile" && (
          <div className="p-4 border rounded-2xl">
            <h3 className="font-semibold text-red-800 mb-2">الملف</h3>
            <div className="text-sm text-gray-600">قسم بسيط للبيانات الشخصية لاحقًا…</div>
          </div>
        )}

        {selectedAppt && (
          <ApptDetail
            appt={selectedAppt}
            update={(u) =>
              setAppts((prev) => prev.map((a) => (a.id === selectedAppt.id ? { ...a, ...u } : a)))
            }
            onClose={close}
          />
        )}
      </div>
    </div>
  );
}

/** قائمة المواعيد + فلاتر بسيطة */
function AppointmentsList({
  appts,
  setAppts,
  onOpen,
}: {
  appts: Appointment[];
  setAppts: (u: ((p: Appointment[]) => Appointment[]) | Appointment[]) => void;
  onOpen: (id: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<ApptStatus | "all">("all");
  const [branchFilter, setBranchFilter] = useState<string>("all");

  const branches = useMemo(() => {
    const s = new Set<string>();
    appts.forEach((a) => s.add(a.branch));
    return ["all", ...Array.from(s)];
  }, [appts]);

  const list = appts
    .filter((a) => (statusFilter === "all" ? true : a.status === statusFilter))
    .filter((a) => (branchFilter === "all" ? true : a.branch === branchFilter))
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  // إضافة موعد تجريبي
  const addDummy = () => {
    const id = `TM-${Date.now()}`;
    setAppts((prev) => [
      ...prev,
      {
        id,
        customer: "زبون جديد",
        area: "—",
        branch: "فرع عام",
        secretaryName: "سكرتيرة",
        date: "2025-11-09",
        time: "13:00",
        status: "scheduled",
      },
    ]);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="border rounded-2xl px-3 py-1.5 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
        >
          <option value="all">كل الحالات</option>
          <option value="scheduled">مجدولة</option>
          <option value="confirm_pending">بانتظار تأكيد (30 دقيقة)</option>
          <option value="confirmed">مؤكدة</option>
          <option value="visited">تمت الزيارة</option>
          <option value="cancelled">ملغاة</option>
        </select>

        <select
          className="border rounded-2xl px-3 py-1.5 text-sm"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
        >
          {branches.map((b) => (
            <option key={b} value={b}>
              {b === "all" ? "كل الفروع" : b}
            </option>
          ))}
        </select>

        <button className="border rounded-2xl px-3 py-1.5 text-sm" onClick={addDummy}>
          إضافة موعد تجريبي
        </button>
      </div>

      {list.map((a) => {
        const start = toDateTime(a.date, a.time);
        const minsToStart = diffMinutes(start, new Date());
        const within30 = minsToStart <= 30 && minsToStart >= 0;

        return (
          <div key={a.id} className="p-3 border rounded-2xl">
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium text-red-800">
                {a.date} {a.time} · {a.customer}
              </div>
              <span className="text-xs text-gray-600">
                {a.area} · {a.branch} · السكرتيرة: {a.secretaryName}
              </span>
            </div>

            <div className="text-xs text-gray-600 mt-1">
              الحالة: {labelStatus(a.status)}{" "}
              {a.status === "confirm_pending" && (
                <span className="ml-2">— يبدأ خلال: {minsToStart} د</span>
              )}
              {a.status === "confirmed" && a.confirmedAt ? (
                <span className="ml-2 text-green-700">— تم التأكيد عند: {a.confirmedAt}</span>
              ) : null}
              {a.status === "cancelled" && a.cancelReason ? (
                <span className="ml-2 text-red-700">— سبب الإلغاء: {a.cancelReason}</span>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap gap-2">
              <button className="border rounded-2xl px-3 py-1.5 text-sm" onClick={() => onOpen(a.id)}>
                فتح التفاصيل
              </button>

              {/* زر التأكيد قبل 30 دقيقة */}
              <button
                className={`rounded-2xl px-3 py-1.5 text-sm ${
                  within30 && a.status !== "confirmed" && a.status !== "cancelled" ? "bg-red-800 text-white" : "border text-gray-500"
                }`}
                disabled={!(within30 && a.status !== "confirmed" && a.status !== "cancelled")}
                onClick={() =>
                  setAppts((prev) =>
                    prev.map((x) =>
                      x.id === a.id ? { ...x, status: "confirmed", confirmedAt: nowYMDHM() } : x
                    )
                  )
                }
              >
                تأكيد الموعد الآن
              </button>

              {/* إلغاء الموعد */}
              <button
                className="border rounded-2xl px-3 py-1.5 text-sm"
                onClick={() => {
                  const reason = prompt("أدخل سبب الإلغاء");
                  // لو الإلغاء خلال 30 دقيقة → السبب إلزامي
                  if (minsToStart <= 30 && minsToStart >= 0 && !reason) {
                    alert("يجب كتابة سبب الإلغاء لأنه خلال 30 دقيقة قبل الموعد.");
                    return;
                  }
                  setAppts((prev) =>
                    prev.map((x) => (x.id === a.id ? { ...x, status: "cancelled", cancelReason: reason || "—" } : x))
                  );
                }}
                disabled={a.status === "cancelled" || a.status === "visited"}
              >
                إلغاء الموعد
              </button>
            </div>
          </div>
        );
      })}

      {list.length === 0 && <div className="text-sm text-gray-500">لا توجد مواعيد مطابقة للفلتر</div>}
    </div>
  );
}

/** بطاقة تفاصيل الموعد: البيع/عدم البيع + عدد التوصيات + (تأكيد/إلغاء) */
function ApptDetail({
  appt,
  update,
  onClose,
}: {
  appt: Appointment;
  update: (u: Partial<Appointment>) => void;
  onClose: () => void;
}) {
  const start = toDateTime(appt.date, appt.time);
  const minsToStart = diffMinutes(start, new Date());
  const within30 = minsToStart <= 30 && minsToStart >= 0;

  const [saleMade, setSaleMade] = useState<boolean | null>(appt.saleMade ?? null);
  const [referrals, setReferrals] = useState<number | "">(appt.referrals ?? "");
  const [cancelReason, setCancelReason] = useState<string>(appt.cancelReason || "");

  // حفظ التعديلات
  const saveVisit = () => {
    if (referrals === "" || Number(referrals) < 0) {
      alert("أدخل عدد التوصيات (0 أو أكثر).");
      return;
    }
    update({
      saleMade,
      referrals: Number(referrals),
      status: "visited",
    });
    alert("تم حفظ نتيجة الزيارة (بيع/لا) وعدد التوصيات.");
    onClose();
  };

  const confirmNow = () => {
    if (!(within30 && appt.status !== "cancelled")) {
      alert("يمكن التأكيد فقط خلال 30 دقيقة قبل الموعد.");
      return;
    }
    update({ status: "confirmed", confirmedAt: nowYMDHM() });
  };

  const cancelNow = () => {
    // إن كان خلال 30 دقيقة → سبب إلزامي
    if (within30 && !cancelReason.trim()) {
      alert("يجب كتابة سبب الإلغاء لأنه خلال 30 دقيقة قبل الموعد.");
      return;
    }
    update({ status: "cancelled", cancelReason: cancelReason.trim() || "—" });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 grid place-items-center p-4 z-50">
      <div className="w-full max-w-2xl bg-white rounded-3xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-red-800">تفاصيل الموعد</h3>
          <button className="border rounded-2xl px-3 py-1.5 text-sm" onClick={onClose}>
            إغلاق
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-3 text-sm">
          <div className="border rounded-2xl p-3">
            <div><b>العميل:</b> {appt.customer}</div>
            <div><b>المنطقة:</b> {appt.area}</div>
            <div><b>الفرع:</b> {appt.branch}</div>
            <div><b>السكرتيرة:</b> {appt.secretaryName}</div>
          </div>
          <div className="border rounded-2xl p-3">
            <div><b>التاريخ:</b> {appt.date}</div>
            <div><b>الوقت:</b> {appt.time}</div>
            <div><b>الحالة:</b> {labelStatus(appt.status as any)}</div>
            {appt.confirmedAt && <div><b>تأكيد عند:</b> {appt.confirmedAt}</div>}
          </div>
        </div>

        {/* إجراءات قبل الزيارة: تأكيد/إلغاء */}
        <div className="border rounded-2xl p-3 space-y-2">
          <div className="text-sm font-medium mb-1">إجراءات قبل الزيارة</div>
          <div className="flex flex-wrap gap-2">
            <button
              className={`rounded-2xl px-3 py-1.5 text-sm ${
                within30 && appt.status !== "cancelled" ? "bg-red-800 text-white" : "border text-gray-500"
              }`}
              disabled={!(within30 && appt.status !== "cancelled")}
              onClick={confirmNow}
            >
              تأكيد الموعد الآن (قبل 30 دقيقة)
            </button>
            <div className="flex items-center gap-2">
              <input
                className="border rounded-2xl p-2 text-sm"
                placeholder="سبب الإلغاء (مطلوب إن كان خلال 30 دقيقة)"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
              <button className="border rounded-2xl px-3 py-1.5 text-sm" onClick={cancelNow}>
                إلغاء الموعد
              </button>
            </div>
          </div>
          {within30 && <div className="text-xs text-gray-500">المتبقي للموعد: {minsToStart} دقيقة</div>}
        </div>

        {/* بعد الزيارة: عرض المنتجات + نتيجة البيع + التوصيات */}
        <div className="border rounded-2xl p-3 space-y-2">
          <div className="text-sm font-medium">بعد الزيارة</div>
          <div className="flex flex-wrap gap-2">
            <button
              className="border rounded-2xl px-3 py-1.5 text-sm"
              onClick={() => alert("واجهة عرض المنتجات — Placeholder")}
            >
              عرض المنتجات للعميل
            </button>
          </div>
          <div className="grid md:grid-cols-3 gap-2 text-sm">
            <div className="col-span-1">
              <label className="text-xs text-gray-500 mb-1 block">نتيجة الزيارة</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    checked={saleMade === true}
                    onChange={() => setSaleMade(true)}
                  />
                  تم البيع
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    checked={saleMade === false}
                    onChange={() => setSaleMade(false)}
                  />
                  لم يتم
                </label>
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">عدد التوصيات من الزبون</label>
              <input
                type="number"
                className="border rounded-2xl p-2 w-full"
                value={referrals}
                onChange={(e) => setReferrals(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="0 أو أكثر"
                min={0}
              />
            </div>
          </div>
          <div className="pt-1">
            <button className="bg-red-800 text-white rounded-2xl px-4 py-2 text-sm" onClick={saveVisit}>
              حفظ نتيجة الزيارة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** تحويل حالة لوسم نصّي */
function labelStatus(s: ApptStatus) {
  switch (s) {
    case "scheduled":
      return "مجدولة";
    case "confirm_pending":
      return "بانتظار تأكيد";
    case "confirmed":
      return "مؤكدة";
    case "visited":
      return "تمت الزيارة";
    case "cancelled":
      return "ملغاة";
  }
}
