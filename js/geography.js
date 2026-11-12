/* Geographic coordinates are independent of Excel distances.
 * Provisional reuse of the OLD curve in the Shire area, NOT a verified map of
 * Bywater/Woody End/Stock/Buckland. The original Shire prefix is retained below.
 * The original Bree position is reused by the chapter II extension.
 * knot: index + fraction of an existing curve segment's geometric length.
 * Replace knot assignments with surveyed geometry after manual map review.
 */
window.SHIRE_GEOGRAPHY={
 status:'needs-manual-review',
 // Display policy only; independent of curve anchors, event types and rewards.
 markers:{'misty-012':{showOnMap:true,priority:1},'misty-027':{showOnMap:true,priority:1},'misty-031':{showOnMap:true,priority:1},'mirkwood-013':{showOnMap:true,priority:1},'mirkwood-025':{showOnMap:true,priority:1},'mirkwood-037':{showOnMap:true,priority:1},'erebor-018':{showOnMap:true,priority:1},'erebor-022':{showOnMap:true,priority:1},'erebor-025':{showOnMap:true,priority:3},'rivendell-014':{showOnMap:true,priority:1},'rivendell-020':{showOnMap:true,priority:1},'rivendell-035':{showOnMap:true,priority:1},'rivendell-038':{showOnMap:true,priority:2},'shire-001':{showOnMap:true,priority:3},'shire-029':{showOnMap:true,priority:1},'shire-033':{showOnMap:true,priority:2},'bree-005':{showOnMap:true,priority:1},'bree-014':{showOnMap:true,priority:1},'bree-020':{showOnMap:true,priority:2},'lonelylands-009':{showOnMap:true,priority:1},'lonelylands-022':{showOnMap:true,priority:2}},
 note:'Опорные области сверены с картой; точная дорога и промежуточные ориентиры требуют проверки.',
 // Extensions digitized from the map image: forest, barrows, Bree, marsh symbols, Amon Sul.
 // First three original Bezier segments remain byte-for-byte unchanged.
 keepOriginalSegments:3,
 extensions:[
  {c1:[1944,958],c2:[1954,997],end:[1975,1005],label:'Старый лес',needsReview:true},
  {c1:[1992,1012],c2:[2010,1040],end:[2030,1030],label:'Холмы Упокоищ',needsReview:true},
  {c1:[2060,1015],c2:[2060,935],end:[2083,911],label:'Бри',needsReview:false},
  {c1:[2100,893],c2:[2117,859],end:[2144,856],label:'Комариные топи',needsReview:true},
  {c1:[2175,853],c2:[2221,898],end:[2240,925],label:'Заветерь / Амон Сул',needsReview:false},
  {c1:[2254,945],c2:[2290,981],end:[2326,981],label:'Дикие земли',needsReview:true},
  {c1:[2343,981],c2:[2353,956],end:[2362,931],label:'Митейтель / Последний мост',needsReview:true},
  {c1:[2371,906],c2:[2390,891],end:[2410,881],label:'Троллистое плоскогорье',needsReview:true},
  {c1:[2424,874],c2:[2434,860],end:[2444,856],label:'Каменные тролли',needsReview:true},
  {c1:[2455,852],c2:[2465,853],end:[2466,868],label:'Восточные ущелья',needsReview:true},
  {c1:[2467,883],c2:[2448,918],end:[2454,936],label:'Брод Гремячей',needsReview:true},
  {c1:[2460,954],c2:[2495,938],end:[2502,917],label:'Ривенделл',needsReview:false},
  {"c1":[2509,896],"c2":[2572.833,873.667],"end":[2595,855],"label":"Западные предгорья","needsReview":true},
  {"c1":[2617.167,836.333],"c2":[2622.5,816.667],"end":[2635,805],"label":"Высокий перевал","needsReview":true},
  {"c1":[2647.5,793.333],"c2":[2658.333,783.333],"end":[2670,785],"label":"Гоблинские тоннели","needsReview":true},
  {"c1":[2681.667,786.667],"c2":[2690,809.167],"end":[2705,815],"label":"Восточные склоны","needsReview":true},
  {"c1":[2720,820.833],"c2":[2746.667,824.167],"end":[2760,820],"label":"Каррок","needsReview":true},
  {"c1":[2773.333,815.833],"c2":[2776.667,798.333],"end":[2785,790],"label":"Дом Беорна","needsReview":true},
  {"c1":[2793.333,781.667],"c2":[2803.333,778.333],"end":[2810,770],"label":"Земли беорнингов","needsReview":true},
  {"c1":[2816.667,761.667],"c2":[2810.833,744.167],"end":[2825,740],"label":"Лесные Ворота","needsReview":true},
  {"c1":[2839.167,735.833],"c2":[2864.667,740],"end":[2895,745],"label":"Эльфийская тропа","needsReview":true},
  {"c1":[2925.333,750],"c2":[2979.5,760.833],"end":[3007,770],"label":"Зачарованный ручей","needsReview":true},
  {"c1":[3034.5,779.167],"c2":[3037.833,788.333],"end":[3060,800],"label":"Паучьи поляны","needsReview":true},
  {"c1":[3082.167,811.667],"c2":[3120,826.667],"end":[3140,840],"label":"Чертоги Трандуила","needsReview":true},
  {"c1":[3160,853.333],"c2":[3164.167,870],"end":[3180,880],"label":"Лесная река","needsReview":true},
  {"c1":[3195.833,890],"c2":[3221.167,889.5],"end":[3235,900],"label":"Долгие топи","needsReview":true},
  {"c1":[3248.833,910.5],"c2":[3255.833,954.667],"end":[3263,943],"label":"Эсгарот","needsReview":true},
  {"c1":[3270.167,931.333],"c2":[3274,857.167],"end":[3278,830],"label":"Дейл","needsReview":true},
  {"c1":[3282,802.833],"c2":[3284,796.667],"end":[3287,780],"label":"Эребор","needsReview":true}
 ],
 anchors:[{x:1732,y:947},{x:1783,y:979},{x:1875,y:995},{x:1930,y:965},{x:2023,y:939},{x:2083,y:911}],
 segments:[
  {id:1,startKnot:0,endKnot:0.5,needsReview:true},
  {id:2,startKnot:0.5,endKnot:1,needsReview:true},
  {id:3,startKnot:1,endKnot:1.5,needsReview:true},
  {id:4,startKnot:1.5,endKnot:2,needsReview:true},
  {id:5,startKnot:2,endKnot:2.3333333333333335,needsReview:true},
  {id:6,startKnot:2.3333333333333335,endKnot:2.6666666666666665,needsReview:true},
  {id:7,startKnot:2.6666666666666665,endKnot:3,needsReview:true},
  {id:8,startKnot:3,endKnot:4,needsReview:true},
  {id:9,startKnot:4,endKnot:4.5,needsReview:true,note:'Дом Бомбадила не отмечен на этой карте; предварительная позиция в лесной области.'},
  {id:10,startKnot:4.5,endKnot:5,needsReview:true},
  {id:11,startKnot:5,endKnot:6,needsReview:true},
  {id:12,startKnot:6,endKnot:6.5,needsReview:true,note:'Северные холмы — авторский ориентир; не Северное нагорье.'},
  {id:13,startKnot:6.5,endKnot:7,needsReview:true},
  {id:14,startKnot:7,endKnot:7.5,needsReview:true,note:'Пустоши — область, точная путевая точка не подтверждена.'},
  {id:15,startKnot:7.5,endKnot:8,needsReview:true},
  {id:16,startKnot:8,endKnot:9,needsReview:true},
  {id:17,startKnot:9,endKnot:10,needsReview:true},
  {id:18,startKnot:10,endKnot:11,needsReview:true},
  {id:19,startKnot:11,endKnot:12,needsReview:true},
  {id:20,startKnot:12,endKnot:13,needsReview:true},
  {id:21,startKnot:13,endKnot:14,needsReview:true},
  {id:22,startKnot:14,endKnot:15,needsReview:true},
  {id:23,startKnot:15,endKnot:16,needsReview:true},
  {id:24,startKnot:16,endKnot:17,needsReview:true},
  {id:25,startKnot:17,endKnot:18,needsReview:true},
  {id:26,startKnot:18,endKnot:19,needsReview:true},
  {id:27,startKnot:19,endKnot:20,needsReview:true},
  {id:28,startKnot:20,endKnot:21,needsReview:true},
  {id:29,startKnot:21,endKnot:22,needsReview:true},
  {id:30,startKnot:22,endKnot:23,needsReview:true},
  {id:31,startKnot:23,endKnot:24,needsReview:true},
  {id:32,startKnot:24,endKnot:25,needsReview:true},
  {id:33,startKnot:25,endKnot:26,needsReview:true},
  {id:34,startKnot:26,endKnot:27,needsReview:true},
  {id:35,startKnot:27,endKnot:28,needsReview:true},
  {id:36,startKnot:28,endKnot:29,needsReview:true},
  {id:37,startKnot:29,endKnot:30,needsReview:true},
  {id:38,startKnot:30,endKnot:31,needsReview:true},
  {id:39,startKnot:31,endKnot:32,needsReview:true}
 ]
};
