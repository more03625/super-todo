'use client';

/* Lightweight skeleton of the week view, shown while the /week route chunk or
 * auth state loads. Mirrors the layout and palette of WeekView in
 * ritual-preview.tsx so the swap-in is seamless. */

const C = {
  bg: '#F4F6F9',
  card: '#FFFFFF',
  border: '#D8DCE3',
  bone: '#E4E8EE',
};

function Bone({ w, h, r = 8, style }: { w: number | string; h: number; r?: number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: r,
        background: C.bone,
        animation: 'weekSkeletonPulse 1.1s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

export function WeekSkeleton() {
  return (
    <div style={{ background: C.bg, height: '100dvh', overflow: 'hidden' }}>
      <style>{`@keyframes weekSkeletonPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }`}</style>
      <div style={{ width: '100%', maxWidth: 440, margin: '0 auto', padding: '24px 16px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* header: back / week range / calendar button */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <Bone w={64} h={16} />
          <Bone w={150} h={16} />
          <Bone w={36} h={36} r={10} />
        </div>

        {/* week card: day pills + main ring */}
        <div style={{ background: C.card, borderRadius: 24, border: `1px solid ${C.border}`, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <Bone w={80} h={12} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, justifyItems: 'center', marginBottom: 24 }}>
            {Array.from({ length: 7 }, (_, i) => (
              <Bone key={i} w={38} h={38} r={19} />
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 180,
                height: 180,
                borderRadius: '50%',
                border: `22px solid ${C.bone}`,
                animation: 'weekSkeletonPulse 1.1s ease-in-out infinite',
              }}
            />
            <Bone w={120} h={13} />
          </div>
        </div>

        {/* task list card */}
        <div style={{ background: C.card, borderRadius: 24, border: `1px solid ${C.border}`, padding: 16 }}>
          <Bone w={100} h={12} style={{ marginBottom: 14 }} />
          {Array.from({ length: 3 }, (_, i) => (
            <Bone key={i} w="100%" h={50} r={16} style={{ marginBottom: 8 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default WeekSkeleton;
