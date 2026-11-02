import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { getPose } from '../../content';
import { LEN, poseAt, solvePose, type Limb, type Vec } from '../domain/pose';
import { usePalette } from '../theme';

const GROUND_Y = 92;

/** Horloge partagée à ~30 images/s, active seulement quand un pictogramme est animé. */
function useClock(active: boolean): number {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    let raf = 0;
    let last = 0;
    const tick = () => {
      const now = Date.now();
      if (now - last > 33) {
        last = now;
        setMs(now - start);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return ms;
}

const pts = (l: Limb) => `M${l.root[0]},${l.root[1]} L${l.mid[0]},${l.mid[1]} L${l.end[0]},${l.end[1]}`;

function footPath(l: Limb): string {
  const dx = l.end[0] - l.mid[0];
  const dy = l.end[1] - l.mid[1];
  const d = Math.hypot(dx, dy) || 1;
  // pied perpendiculaire au tibia, orienté vers l'avant
  const fx = (dy / d) * 6;
  const fy = (-dx / d) * 6;
  return `M${l.end[0]},${l.end[1]} L${l.end[0] + fx},${l.end[1] + fy}`;
}

/**
 * Pictogramme animé d'un exercice (bonhomme de profil).
 * Rien n'est affiché si l'exercice n'a pas encore d'animation.
 */
export function Pictogram({
  exerciseId,
  size = 120,
  animate = true,
  framed = true,
  frame,
}: {
  exerciseId: string;
  size?: number;
  animate?: boolean;
  framed?: boolean;
  /** Affiche une pose fixe (index) au lieu de l'animation. */
  frame?: number;
}) {
  const c = usePalette();
  const anim = getPose(exerciseId);
  const moving = animate && frame === undefined && !!anim && anim.frames.length > 1;
  const ms = useClock(moving);

  const sk = useMemo(() => {
    if (!anim) return null;
    const pose = moving
      ? poseAt(anim, ms)
      : anim.frames[Math.min(frame ?? anim.frames.length - 1, anim.frames.length - 1)];
    return solvePose(pose);
  }, [anim, moving, ms, frame]);

  if (!anim || !sk) return null;

  const body = c.text;
  const far = c.textFaint;
  const eqColor = c.accent;
  const w = 5;
  const torso = `M${sk.hip[0]},${sk.hip[1]} Q${sk.torsoCtrl[0]},${sk.torsoCtrl[1]} ${sk.shoulder[0]},${sk.shoulder[1]}`;
  const hands: Vec[] = [sk.arm.end, ...(sk.arm2 ? [sk.arm2.end] : [])];
  const top = anim.view === 'top';

  return (
    <View
      style={{
        width: size,
        height: (size * 100) / 120,
        borderRadius: 14,
        backgroundColor: framed ? c.surfaceAlt : 'transparent',
        overflow: 'hidden',
      }}
      accessible
      accessibilityRole="image"
      accessibilityLabel="Animation du mouvement"
    >
      <Svg width="100%" height="100%" viewBox="-6 -14 132 110">
        {!top && <Line x1={4} x2={116} y1={GROUND_Y} y2={GROUND_Y} stroke={c.border} strokeWidth={2} strokeLinecap="round" />}
        {sk.props.map((p, i) =>
          p.type === 'wall' ? (
            <Line key={i} x1={p.x} x2={p.x} y1={4} y2={GROUND_Y} stroke={c.border} strokeWidth={3} />
          ) : (
            <Rect key={i} x={p.x} y={p.y} width={p.w} height={p.h} rx={3} fill={c.border} />
          ),
        )}

        {/* côté caché (plus clair) */}
        {sk.leg2 && <Path d={pts(sk.leg2)} stroke={far} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
        {sk.leg2 && !top && <Path d={footPath(sk.leg2)} stroke={far} strokeWidth={4} strokeLinecap="round" />}
        {sk.arm2 && <Path d={pts(sk.arm2)} stroke={far} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />}

        {/* corps */}
        <Path d={pts(sk.leg)} stroke={body} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        {!top && <Path d={footPath(sk.leg)} stroke={body} strokeWidth={4} strokeLinecap="round" />}
        <Path d={torso} stroke={body} strokeWidth={w + 1} fill="none" strokeLinecap="round" />
        <Circle cx={sk.head[0]} cy={sk.head[1]} r={LEN.headR} fill={body} />
        <Path d={pts(sk.arm)} stroke={body} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />

        {/* matériel */}
        {anim.eq === 'barbell' &&
          (anim.eqAt === 'hip' ? [sk.hip] : [sk.arm.end]).map((h, i) => (
            <Circle key={i} cx={h[0]} cy={h[1] - (anim.eqAt === 'hip' ? 4 : 0)} r={9} stroke={eqColor} strokeWidth={3.5} fill="none" />
          ))}
        {anim.eq === 'dumbbell' &&
          hands.map((h, i) => <Circle key={i} cx={h[0]} cy={h[1]} r={4.5} fill={eqColor} />)}
      </Svg>
    </View>
  );
}
