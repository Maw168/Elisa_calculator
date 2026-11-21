import { useEffect, useRef, type RefObject } from 'react';
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  LinearScale,
  Tooltip,
  type ChartConfiguration,
  type Plugin,
} from 'chart.js';
import type { ConditionResult } from '../core/calc';
import type { ErrorBar, Unit } from '../core/types';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

interface Props {
  conditions: ConditionResult[];
  colorOf: (condition: string) => string;
  errorBar: ErrorBar;
  unit: Unit;
  canvasRef: RefObject<HTMLCanvasElement>;
}

interface Extra {
  conditions: ConditionResult[];
  errorBar: ErrorBar;
}

const INK = '#1f2328';

const whiteBackground: Plugin<'bar'> = {
  id: 'whiteBackground',
  beforeDraw(chart) {
    const { ctx, width, height } = chart;
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
};

const errorBarsAndPoints: Plugin<'bar'> = {
  id: 'errorBarsAndPoints',
  afterDatasetsDraw(chart) {
    const extra = (chart.options.plugins as unknown as { extra?: Extra }).extra;
    if (!extra) return;
    const { ctx } = chart;
    const y = chart.scales.y;
    chart.getDatasetMeta(0).data.forEach((bar, i) => {
      const c = extra.conditions[i];
      if (!c) return;
      const x = bar.x;
      ctx.save();
      ctx.strokeStyle = INK;
      ctx.fillStyle = INK;
      ctx.lineWidth = 1.5;
      const err = extra.errorBar === 'SD' ? c.sd : c.sem;
      if (c.mean !== null && err !== null) {
        const top = y.getPixelForValue(c.mean + err);
        const bottom = y.getPixelForValue(c.mean - err);
        ctx.beginPath();
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
        ctx.moveTo(x - 6, top);
        ctx.lineTo(x + 6, top);
        ctx.moveTo(x - 6, bottom);
        ctx.lineTo(x + 6, bottom);
        ctx.stroke();
      }
      const values = [...c.bioValues.values()].filter((v): v is number => v !== null);
      values.forEach((v, k) => {
        const offset = (k - (values.length - 1) / 2) * 7;
        ctx.beginPath();
        ctx.arc(x + offset, y.getPixelForValue(v), 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    });
  },
};

function maxValue(conditions: ConditionResult[], errorBar: ErrorBar): number {
  let m = 0;
  for (const c of conditions) {
    const err = (errorBar === 'SD' ? c.sd : c.sem) ?? 0;
    if (c.mean !== null) m = Math.max(m, c.mean + err);
    for (const v of c.bioValues.values()) if (v !== null) m = Math.max(m, v);
  }
  return m;
}

function buildConfig(props: Props): ChartConfiguration<'bar'> {
  const { conditions, colorOf, errorBar, unit } = props;
  const extra: Extra = { conditions, errorBar };
  return {
    type: 'bar',
    data: {
      labels: conditions.map((c) => c.condition),
      datasets: [
        {
          data: conditions.map((c) => c.mean),
          backgroundColor: conditions.map((c) => colorOf(c.condition)),
          borderColor: INK,
          borderWidth: 1,
          maxBarThickness: 48,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      devicePixelRatio: Math.max(2, typeof window === 'undefined' ? 2 : window.devicePixelRatio),
      scales: {
        x: { grid: { display: false }, ticks: { color: INK, autoSkip: false, maxRotation: 45 } },
        y: {
          beginAtZero: true,
          suggestedMax: maxValue(conditions, errorBar) * 1.1,
          title: { display: true, text: unit, color: INK },
          ticks: { color: INK },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => {
              const c = conditions[item.dataIndex];
              const err = errorBar === 'SD' ? c.sd : c.sem;
              const vals = [...c.bioValues.values()].map((v) => (v === null ? '–' : v.toFixed(2))).join(', ');
              return `${c.mean?.toFixed(2) ?? '–'}${err !== null ? ` ± ${err.toFixed(2)} (${errorBar})` : ''} ${unit} · n=${c.n} · [${vals}]`;
            },
          },
        },
        // Read by the errorBarsAndPoints plugin.
        ...({ extra } as object),
      },
    },
    plugins: [whiteBackground, errorBarsAndPoints],
  };
}

export function ResultsChart(props: Props) {
  const { canvasRef } = props;
  const chartRef = useRef<Chart<'bar'> | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const config = buildConfig(props);
    if (!chartRef.current) {
      chartRef.current = new Chart(canvas, config);
    } else {
      chartRef.current.data = config.data;
      chartRef.current.options = config.options!;
      chartRef.current.update();
    }
  });

  useEffect(
    () => () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    },
    [],
  );

  return (
    <div className="chart-wrap">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={`Bar chart of mean ${props.unit} per condition with ${props.errorBar} error bars and biological replicate points`}
      />
    </div>
  );
}
