import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList
} from 'recharts';
import { Info } from 'lucide-react';

export default function TrackingChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground h-[400px]">
         <p>No hay datos de evolución disponibles.</p>
      </div>
    );
  }

  // Pre-process data to identify the last point for labeling
  const processedData = useMemo(() => {
    if (!data) return [];
    
    // Primero, ordenar cronológicamente por 'ts' para asegurar que la reescritura del Map refleje el más reciente
    const sortedChronologically = [...data].sort((a, b) => new Date(a.ts) - new Date(b.ts));
    
    // Deduplicar: mantener únicamente el último objeto registrado para un % de actas dado
    const map = new Map();
    sortedChronologically.forEach(item => {
      map.set(item.pct, item);
    });

    // Ordenar de vuelta por 'pct' para que Recharts dibuje la X de izquierda a derecha correctamente
    const arr = Array.from(map.values()).sort((a, b) => a.pct - b.pct);
    
    // Mark the final item to attach custom labels
    if (arr.length > 0) {
      arr[arr.length - 1].isLast = true;
    }
    return arr;
  }, [data]);

  const lastPoint = processedData[processedData.length - 1];

  const formatXAxis = (tickItem) => {
    return `${tickItem.toFixed(0)}%`;
  };

  const formatYAxis = (tickItem) => {
    return `${tickItem.toFixed(1)}%`;
  };

  const formatTooltip = (value, name) => {
    let fullName = name;
    if (name === "fujimori") fullName = "Fujimori";
    else if (name === "rla") fullName = "López Aliaga";
    else if (name === "nieto") fullName = "Nieto";
    else if (name === "sanchez") fullName = "Sánchez";
    else if (name === "belmont") fullName = "Belmont";
    
    return [`${Number(value).toFixed(3)}%`, fullName];
  };

  // Custom label at the end of the line
  const CustomLabel = (props) => {
    const { x, y, value, index, color } = props;
    if (index === processedData.length - 1) {
      return (
        <g>
          {/* Diamond shape */}
          <polygon 
            points={`${x-5},${y} ${x},${y-5} ${x+5},${y} ${x},${y+5}`} 
            fill={color} 
          />
          <text 
            x={x + 10} 
            y={y} 
            dy={4} 
            fill={color} 
            fontSize={12} 
            fontWeight="bold"
            textAnchor="start"
          >
            {value.toFixed(2)}%
          </text>
        </g>
      );
    }
    return null;
  };

  // We want to give a bit of padding on the right so the labels don't cut off
  return (
    <div className="flex flex-col w-full">
      <div className="w-full h-[400px] md:h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={processedData}
            margin={{
              top: 20,
              right: 60, // extra right margin for the final labels
              left: 0,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={true} horizontal={true} stroke="#E2E8F0" />
            
            <XAxis 
              dataKey="pct" 
              tickFormatter={formatXAxis} 
              type="number"
              domain={['dataMin', 100]}
              tick={{ fontSize: 11, fill: '#64748B' }}
              stroke="#CBD5E1"
              label={{ value: '% actas ONPE', position: 'insideBottom', offset: -15, fill: '#64748B', fontSize: 12, fontWeight: '500' }}
            />
            
            <YAxis 
              tickFormatter={formatYAxis} 
              domain={[dataMin => Math.floor(dataMin - 1), dataMax => Math.ceil(dataMax + 1)]}
              tick={{ fontSize: 11, fill: '#64748B' }}
              stroke="#CBD5E1"
              label={{ value: '% votos válidos', angle: -90, position: 'insideLeft', fill: '#64748B', fontSize: 12, fontWeight: '500', dy: 50, dx: 15 }}
            />
            
            <Tooltip 
              formatter={formatTooltip}
              labelFormatter={(label) => `Avance: ${Number(label).toFixed(2)}% actas`}
              contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
            />
            
            {/* Lines. 
                Using the colors assigned to parties in api/onpe: 
                Fujimori: #F97316 (Naranja)
                RLA: #0284C7 (Celeste)
                Nieto: #EAB308 (Amarillo/Rojo)
                Sanchez: #10B981 (Verde)
                Belmont: #DC2626 (Rojo)
            */}
            
            <Line 
              type="monotone" 
              dataKey="fujimori" 
              stroke="#F97316" 
              strokeWidth={2.5} 
              dot={{ r: 2.5, fill: '#F97316', strokeWidth: 0 }} 
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
              isAnimationActive={false}
            >
              <LabelList dataKey="fujimori" content={(props) => <CustomLabel {...props} color="#F97316" />} />
            </Line>
            
            <Line 
              type="monotone" 
              dataKey="rla" 
              stroke="#0284C7" 
              strokeWidth={2.5} 
              dot={{ r: 2.5, fill: '#0284C7', strokeWidth: 0 }} 
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
              isAnimationActive={false}
            >
              <LabelList dataKey="rla" content={(props) => <CustomLabel {...props} color="#0284C7" />} />
            </Line>
            
            <Line 
              type="monotone" 
              dataKey="sanchez" 
              stroke="#10B981" 
              strokeWidth={2.5} 
              dot={{ r: 2.5, fill: '#10B981', strokeWidth: 0 }} 
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
              isAnimationActive={false}
            >
              <LabelList dataKey="sanchez" content={(props) => <CustomLabel {...props} color="#10B981" />} />
            </Line>

            <Line 
              type="monotone" 
              dataKey="nieto" 
              stroke="#EAB308" 
              strokeWidth={2.5} 
              dot={{ r: 2.5, fill: '#EAB308', strokeWidth: 0 }} 
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
              isAnimationActive={false}
            >
              <LabelList dataKey="nieto" content={(props) => <CustomLabel {...props} color="#EAB308" />} />
            </Line>

            <Line 
              type="monotone" 
              dataKey="belmont" 
              stroke="#DC2626" 
              strokeWidth={2.5} 
              dot={{ r: 2.5, fill: '#DC2626', strokeWidth: 0 }} 
              activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
              isAnimationActive={false}
            >
              <LabelList dataKey="belmont" content={(props) => <CustomLabel {...props} color="#DC2626" />} />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mt-4 mx-2">
        <h4 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-slate-700 mb-1">
          <Info className="w-3.5 h-3.5" />
          Interpretación de la Gráfica
        </h4>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Evolución de los votos válidos (%) a lo largo del conteo de actas (%). Cada punto representa un corte oficial de la ONPE. Al final de la línea se destaca el porcentaje más reciente.
        </p>
      </div>
    </div>
  );
}
