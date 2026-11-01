export const partyColors = { ODS: 'var(--color-party-ods)', ANO: 'var(--color-party-ano)', ČSSD: 'var(--color-party-cssd)', 'Nestr.': 'var(--color-party-nonpartisan)' }
export type Party = keyof typeof partyColors
const commons = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/'
export const premiers = [
  { name: 'Jan Fischer', party: 'Nestr.' as Party, start: '2009-05-08', image: 'e/ef/Jan_Fischer_2009_%28cropped%29.jpg' },
  { name: 'Petr Nečas', party: 'ODS' as Party, start: '2010-07-13', image: 'c/c8/Necas_in_Latvia_%28cropped%29.jpg' },
  { name: 'Jiří Rusnok', party: 'Nestr.' as Party, start: '2013-07-10', image: '4/4e/Rusnok_Ji%C5%99%C3%AD_2013.JPG' },
  { name: 'Bohuslav Sobotka', party: 'ČSSD' as Party, start: '2014-01-29', image: 'e/e8/Tallinn_Digital_Summit._Arrivals_Bohuslav_Sobotka_%2823536638518%29_%28cropped%29.jpg' },
  { name: 'Andrej Babiš', party: 'ANO' as Party, start: '2017-12-13', image: '2/2a/Andrej_Babi%C5%A1_2025_%28cropped%29.jpg' },
  { name: 'Petr Fiala', party: 'ODS' as Party, start: '2021-12-17', image: '0/05/Czechia_PM_Petr_Fiala_2025_portrait.jpg' },
  { name: 'Andrej Babiš', party: 'ANO' as Party, start: '2025-12-15', image: '2/2a/Andrej_Babi%C5%A1_2025_%28cropped%29.jpg' },
].map(p => ({ ...p, time: Date.parse(p.start), image: `${commons}${p.image}/250px-${p.image.split('/').at(-1)}`, wiki: `https://cs.wikipedia.org/wiki/${encodeURIComponent(p.name.replaceAll(' ', '_'))}` }))
