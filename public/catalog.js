const base='https://d2kt395i2p6b75.cloudfront.net/01M3FAY5W6SYPV4PK9RCTR4P7T/media/';
export const imageFor=(id,kind='video')=>base+(kind==='video'?'videos/posters/'+id+'.jpg':'images/processed/2026/'+kind+'/'+id+'.webp')+'?class=gallery';
export const services=[
['extensions','Loc Extensions',600,100,240,'Transform','01M3KZY97ZC8S4PHNCTQ44A5FS','09'],
['repairs','Loc Repairs',10,null,null,'Maintain','01M3M0WAZ19CJA3GCDES64QSSD','video'],
['twist','Twist & Style',130,25,120,'Maintain','01M3M3JMQJBQ0417WDBAFFC812','09'],
['temporary','Temporary Loc Styles',130,25,120,'Transform','01M3FAYAQG7G70N1XFEGYVJCR8','video'],
['preorder','Loc Extension Pre-Order',250,null,null,'Transform','01M3S7RGBQT9S6TB07PCJC39BF','09'],
['detox','Loc Detox',30,10,60,'Maintain','01M3W0CP86NKY2C51TVW1QX1D4','10'],
['color','Color',100,null,null,'Transform','01H8DCFQR81EYWXZP1G4RH5KKN','video'],
['boho','Retwist w/ Boho',250,50,180,'Style','01M3S866V6T46KRYH6Q3ZMRQFF','09'],
['knots','Miracle Knots',250,null,null,'Style','01M3M83A9W9NB1T6RGSRC36TKG','09']
].map(([id,name,price,deposit,minutes,category,asset,kind])=>({id,name,price,deposit,minutes,category,asset,kind}));
export const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n);
export function quote(id){const s=services.find(s=>s.id===id);if(!s||s.deposit===null)throw Error('Consultation required');return {total:s.price,deposit:s.deposit,balance:s.price-s.deposit};}
