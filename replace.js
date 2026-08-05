const fs = require('fs');
let c = fs.readFileSync('src/components/LoungeUpdates.tsx', 'utf-8');
c = c.replace(/<span className="text-\\[11px\\] font-bold text-brand-text leading-tight mt-0\.5">\{circle\.duration\}<\/span>/g, '<span className="text-[11px] font-bold text-brand-text leading-tight mt-0.5">{formatDateDDMMYYYY(circle.duration)}</span>');
c = c.replace(/<span className="text-\\[11px\\] font-bold text-brand-text leading-tight mt-0\.5">\{circle\.startDate\}<\/span>/g, '<span className="text-[11px] font-bold text-brand-text leading-tight mt-0.5">{formatDateDDMMYYYY(circle.startDate)}</span>');
fs.writeFileSync('src/components/LoungeUpdates.tsx', c);
