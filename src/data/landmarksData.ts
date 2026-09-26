import { PointOfInterest } from '../types/transit';

export const BARCELONA_LANDMARKS: PointOfInterest[] = [
  {
    id: 'poi-sagrada-familia',
    name: {
      es: 'Basílica de la Sagrada Família',
      en: 'Sagrada Família Basilica',
      ca: 'Basílica de la Sagrada Família',
      ar: 'كنيسة ساغرادا فاميليا'
    },
    category: 'monument',
    lat: 41.4036,
    lng: 2.1743,
    description: {
      es: 'Obra cumbre inacabada del arquitecto Antoni Gaudí. Es el monumento más visitado de España y una obra maestra de la arquitectura modernista universal.',
      en: 'Antoni Gaudí\'s unfinished masterpiece basilica. The most visited landmark in Spain and a worldwide jewel of modernist architecture with awe-inspiring light-filled naves.',
      ca: 'Obra mestra inacabada d\'Antoni Gaudí. El monument més visitat de Catalunya i joia del modernisme català amb torres imponents.',
      ar: 'التحفة المعمارية الخالدة للمعماري العالمي أنطوني غاودي، وأشهر معالم إسبانيا وأوروبا بأبراجها الفريدة وزخارفها المذهلة.'
    },
    tips: {
      es: 'Reservar entradas con antelación obligatoria. La luz de la tarde a través de las vidrieras de la fachada de Poniente es espectacular.',
      en: 'Book tickets well in advance online. The late afternoon sunlight through the western stained glass windows creates magical colors.',
      ca: 'Reserva obligatòria amb antelació. La llum de la tarda a través dels vitralls de ponent és espectacular.',
      ar: 'يُنصح بشدة بحجز التذاكر مسبقاً عبر الإنترنت. وقت العصر هو الأفضل لمشاهدة انعكاس أضواء الزجاج الملون.'
    },
    nearestStationId: 'st-sagrada-familia',
    nearestStationName: 'Sagrada Família',
    walkingMinutes: 1,
    connectedLines: ['L2', 'L5'],
    imageCategory: 'gaudi'
  },
  {
    id: 'poi-park-guell',
    name: {
      es: 'Park Güell',
      en: 'Park Güell',
      ca: 'Park Güell',
      ar: 'حديقة بارك غويل'
    },
    category: 'park',
    lat: 41.4145,
    lng: 2.1527,
    description: {
      es: 'Fascinante parque público con jardines y elementos arquitectónicos modernistas situado en la parte alta de Barcelona con vistas panorámicas al mar.',
      en: 'Iconic public park system composed of gardens and architectonic elements designed by Antoni Gaudí, featuring mosaic benches and panoramic views over the Mediterranean.',
      ca: 'Parc públic amb jardins i elements arquitectònics modernistes situat a la part alta de Barcelona amb vistes panoràmiques.',
      ar: 'حديقة عامة أثرية أبدعها غاودي، تتميز بمقاعد الفسيفساء الملونة وإطلالة بانورامية ساحرة على سماء وبحر برشلونة.'
    },
    tips: {
      es: 'Tomar la línea L3 hasta Vallcarca o Lesseps y usar las escaleras mecánicas de Baixada de la Glòria.',
      en: 'Take Metro L3 to Vallcarca or Lesseps station and use the Baixada de la Glòria outdoor escalators up the hill.',
      ca: 'Agafa la línia L3 fins a Vallcarca o Lesseps i utilitza les escales mecàniques de la Baixada de la Glòria.',
      ar: 'استقل خط المترو L3 إلى محطة Vallcarca أو Lesseps واستخدم السلالم المتحركة الخارجية للصعود.'
    },
    nearestStationId: 'st-vallcarca',
    nearestStationName: 'Vallcarca / Lesseps',
    walkingMinutes: 12,
    connectedLines: ['L3', 'V15'],
    imageCategory: 'park'
  },
  {
    id: 'poi-casa-batllo',
    name: {
      es: 'Casa Batlló',
      en: 'Casa Batlló',
      ca: 'Casa Batlló',
      ar: 'كازا باتيو (منزل غاودي)'
    },
    category: 'monument',
    lat: 41.3916,
    lng: 2.1650,
    description: {
      es: 'Edificio modernista situado en el Passeig de Gràcia. Su fachada evoca el lomo de un dragón abatido por la lanza de Sant Jordi, patrón de Cataluña.',
      en: 'UNESCO World Heritage modernist masterpiece on Passeig de Gràcia. Its undulating ceramic facade evokes the back of a dragon slain by Saint George.',
      ca: 'Edifici emblemàtic al Passeig de Gràcia que evoca la llegenda de Sant Jordi i el drac.',
      ar: 'تحفة معمارية مذهلة في شارع باسيغ دي غراسيا، تشبه واجهتها المتموجة ظهر التنين الأسطوري مغطاة بقطع الخزف المضيئة.'
    },
    tips: {
      es: 'Se encuentra a solo 30 metros de la salida de Passeig de Gràcia. Incluye una experiencia inmersiva de realidad aumentada.',
      en: 'Located just steps from the Passeig de Gràcia station exit. Includes an interactive augmented-reality audio-guide.',
      ca: 'A tocar de la sortida de metro de Passeig de Gràcia. Visita immersiva amb realitat augmentada.',
      ar: 'يقع مباشرة على بعد خطوات من مخرج محطة Passeig de Gràcia. تتوفر جولات بالواقع المعزز.'
    },
    nearestStationId: 'st-passeig-gracia',
    nearestStationName: 'Passeig de Gràcia',
    walkingMinutes: 1,
    connectedLines: ['L2', 'L3', 'L4', 'R2'],
    imageCategory: 'gaudi'
  },
  {
    id: 'poi-la-pedrera',
    name: {
      es: 'Casa Milà (La Pedrera)',
      en: 'Casa Milà (La Pedrera)',
      ca: 'Casa Milà (La Pedrera)',
      ar: 'كازا ميلا (لا بيدريرا)'
    },
    category: 'monument',
    lat: 41.3954,
    lng: 2.1619,
    description: {
      es: 'Singular edificio de Gaudí con fachada de piedra esculpida y una célebre azotea con chimeneas esculturales llamadas "los guerreros".',
      en: 'Unique limestone modernist residential structure by Gaudí with an undulating facade and a world-famous rooftop populated by surreal chimney warrior sculptures.',
      ca: 'Edifici singular amb façana de pedra ondulada i el terrat dels guerrers amb vistes increïbles.',
      ar: 'مبنى حجري استثنائي ذو واجهة متموجة وسطح شهير يحتوي على مداخن منحوتة كفرسان حراس تطل على المدينة بأكملها.'
    },
    tips: {
      es: 'La azotea al atardecer ofrece vistas inigualables sobre el Eixample y la Sagrada Família.',
      en: 'The rooftop terrace at golden hour offers unmatched panoramic perspectives towards the Eixample and Sagrada Família.',
      ca: 'El terrat al capvespre ofereix vistes immillorables sobre l\'Eixample.',
      ar: 'زيارة سطح المبنى وقت الغروب تقدم إطلالة خلابة لا تُعوض على حي إيكسامبل وبرشلونة.'
    },
    nearestStationId: 'st-diagonal',
    nearestStationName: 'Diagonal',
    walkingMinutes: 2,
    connectedLines: ['L3', 'L5', 'S1', 'S2'],
    imageCategory: 'gaudi'
  },
  {
    id: 'poi-barri-gotic',
    name: {
      es: 'Barri Gòtic y Catedral de Barcelona',
      en: 'Gothic Quarter & Barcelona Cathedral',
      ca: 'Barri Gòtic i Catedral de Barcelona',
      ar: 'الحي القوطي وكاتدرائية برشلونة'
    },
    category: 'culture',
    lat: 41.3839,
    lng: 2.1762,
    description: {
      es: 'El corazón medieval más antiguo de la ciudad, con laberínticas callejuelas empedradas, restos romanos y la majestuosa Catedral de la Santa Creu.',
      en: 'The historic medieval core of the city, lined with labyrinthine pedestrian alleyways, Roman ruins, hidden tapas squares and the 14th-century Gothic Cathedral.',
      ca: 'El nucli més antic de la ciutat, amb carrerons medievals, places acollidores i la Catedral gòtica.',
      ar: 'أقدم أحياء برشلونة بعبق العصور الوسطى، يضم أزقة مرصوفة بالحجارة وآثاراً رومانية وكاتدرائية الصليب المقدس المهيبة.'
    },
    tips: {
      es: 'Bajar en Jaume I (L4). No perderse el claustro con las 13 ocas blancas y la Plaça del Rei.',
      en: 'Exit at Jaume I (L4). Do not miss the cloister garden with its 13 resident white geese and Plaça del Rei.',
      ca: 'Baixar a Jaume I (L4). Visitar el claustre amb les 13 oques blanques.',
      ar: 'انزل في محطة Jaume I (L4). لا تفوت زيارة الفناء الداخلي والحدائق الحجرية التاريخية.'
    },
    nearestStationId: 'st-via-laietana',
    nearestStationName: 'Jaume I / Via Laietana',
    walkingMinutes: 3,
    connectedLines: ['L4', 'V15'],
    imageCategory: 'cathedral'
  },
  {
    id: 'poi-camp-nou',
    name: {
      es: 'Spotify Camp Nou (FC Barcelona)',
      en: 'Spotify Camp Nou Stadium',
      ca: 'Spotify Camp Nou',
      ar: 'ملعب سبوتيفاي كامب نو (نادي برشلونة)'
    },
    category: 'culture',
    lat: 41.3809,
    lng: 2.1228,
    description: {
      es: 'El mítico estadio y museo oficial del FC Barcelona, templo sagrado del fútbol mundial con el Barça Museum interactivo.',
      en: 'The legendary home stadium and museum of FC Barcelona, the football temple of Catalonia featuring interactive trophy exhibits.',
      ca: 'L\'estadi mític del FC Barcelona i el museu esportiu més visitat de Catalunya.',
      ar: 'معقل نادي برشلونة التاريخي وأكبر ملاعب أوروبا، يضم متحف النادي الغني بالكؤوس والتاريخ الكروي العريق.'
    },
    tips: {
      es: 'Acceso rápido desde la línea L3 (Palau Reial / Maria Cristina) o L5 (Collblanc). En días de partido usar el transporte público.',
      en: 'Fast access via Metro L3 (Palau Reial or Maria Cristina) or Metro L5 (Collblanc). Always use public transit on matchdays.',
      ca: 'Accés ràpid des de L3 (Palau Reial) o L5 (Collblanc). Fes servir el transport públic els dies de partit.',
      ar: 'الوصول الأسهل عبر المترو L3 (محطة Palau Reial) أو L5 (Collblanc). يُفضل استخدام المترو في أيام المباريات.'
    },
    nearestStationId: 'st-palau-reial',
    nearestStationName: 'Palau Reial / Collblanc',
    walkingMinutes: 5,
    connectedLines: ['L3', 'L5', 'T1', 'T2', 'T3'],
    imageCategory: 'stadium'
  },
  {
    id: 'poi-la-rambla',
    name: {
      es: 'La Rambla y Mercat de la Boqueria',
      en: 'La Rambla & La Boqueria Market',
      ca: 'La Rambla i Mercat de la Boqueria',
      ar: 'شارع لا رامبلا وسوق لا بوكيريا'
    },
    category: 'culture',
    lat: 41.3817,
    lng: 2.1715,
    description: {
      es: 'El paseo más célebre de Barcelona, extendiéndose desde Plaça de Catalunya hasta el mar, con el colorido y vibrante mercado gastronómico de la Boqueria.',
      en: 'Barcelona\'s most famous tree-lined boulevard connecting Plaça de Catalunya to the Mediterranean port, home to the bustling culinary stalls of La Boqueria.',
      ca: 'L\'avinguda més emblemàtica de la ciutat que uneix Plaça Catalunya amb el mar i el mercat gastronòmic de la Boqueria.',
      ar: 'أشهر شوارع المشاة المليئة بالحياة والمقاهي والأشجار ممتداً من ساحة كاتالونيا إلى الميناء، ويحتضن سوق البوكيريا الشهير للمأكولات.'
    },
    tips: {
      es: 'Estación Liceu (L3) te deja exactamente en la entrada del mercado. Probar zumos naturales y jamón ibérico fresco.',
      en: 'Metro Liceu (L3) drops you directly at the market gate. Perfect spot for fresh tropical fruit juices and jamón ibérico.',
      ca: 'L\'estació Liceu (L3) et deixa a l\'entrada del mercat.',
      ar: 'محطة مترو Liceu (L3) تقع عند بوابة السوق مباشرة. مكان رائع لتذوق الفواكه الطازجة والمقبلات.'
    },
    nearestStationId: 'st-liceu',
    nearestStationName: 'Liceu',
    walkingMinutes: 1,
    connectedLines: ['L3', '59'],
    imageCategory: 'culture'
  },
  {
    id: 'poi-montjuic',
    name: {
      es: 'Castell de Montjuïc y Font Màgica',
      en: 'Montjuïc Castle & Magic Fountain',
      ca: 'Castell de Montjuïc i Font Màgica',
      ar: 'قلعة مونتجويك والنافورة السحرية'
    },
    category: 'monument',
    lat: 41.3633,
    lng: 2.1664,
    description: {
      es: 'Fortaleza militar del siglo XVII situada en lo alto de la colina de Montjuïc con vistas de 360 grados sobre el puerto comercial y toda la urbe.',
      en: 'Historical 17th-century fortress perched at the summit of Montjuïc hill, commanding 360-degree panoramic vistas over the entire coastline and city.',
      ca: 'Fortalesa militar històrica dalt de la muntanya de Montjuïc amb vistes completes del port i la ciutat.',
      ar: 'قلعة تاريخية يعود بناؤها للقرن السابع عشر على قمة جبل مونتجويك، توفر رؤية شاملة 360 درجة لميناء وشواطئ برشلونة.'
    },
    tips: {
      es: 'Tomar el Funicular de Montjuïc desde Paral·lel (L2/L3) y luego el Teleférico panorámico.',
      en: 'Take the Montjuïc Funicular directly from Paral·lel station (L2/L3) then transfer to the scenic Montjuïc Cable Car.',
      ca: 'Agafa el Funicular des de Paral·lel (L2/L3) i enllaça amb el Telefèric.',
      ar: 'استقل قطار الفونيكولار من محطة Paral·lel ثم التلفريك المعلق للاستمتاع برحلة بانورامية فوق الأشجار.'
    },
    nearestStationId: 'st-parallel',
    nearestStationName: 'Paral·lel (Funicular)',
    walkingMinutes: 8,
    connectedLines: ['L2', 'L3'],
    imageCategory: 'park'
  },
  {
    id: 'poi-barceloneta',
    name: {
      es: 'Platja de la Barceloneta',
      en: 'Barceloneta Beach',
      ca: 'Platja de la Barceloneta',
      ar: 'شاطئ لا بارسيلونيتا'
    },
    category: 'beach',
    lat: 41.3784,
    lng: 2.1925,
    description: {
      es: 'La playa urbana más popular de Barcelona con palmeras, paseo marítimo, restaurantes de marisco y ambiente mediterráneo durante todo el año.',
      en: 'Barcelona\'s lively urban sandy beach lined with palm trees, seaside chiringuitos, seafood paella restaurants and radiant Mediterranean sunshine.',
      ca: 'La platja urbana més concorreguda amb el passeig marítim i tradició marinera.',
      ar: 'أشهر شواطئ برشلونة الساحلية بمحاذاة ممشى النخيل البحري، يزخر بمطاعم المأكولات البحرية والأجواء المتوسطية الممتعة.'
    },
    tips: {
      es: 'Metro L4 Barceloneta o autobús V15 y D20. Ideal para pasear al atardecer y disfrutar de una paella marinera.',
      en: 'Metro L4 Barceloneta or buses V15 and D20. Perfect for an afternoon stroll followed by authentic seafood paella.',
      ca: 'Metro L4 Barceloneta o busos V15 i D20. Ideal per passejar a la vora del mar.',
      ar: 'عبر مترو L4 بمحطة Barceloneta أو خطوط الحافلات V15 و D20. مثالي للمشي عصراً وتناول الباييلا البحرية.'
    },
    nearestStationId: 'st-barceloneta',
    nearestStationName: 'Barceloneta',
    walkingMinutes: 6,
    connectedLines: ['L4', 'V15', 'D20'],
    imageCategory: 'beach'
  },
  {
    id: 'poi-arc-triomf',
    name: {
      es: 'Arc de Triomf y Parc de la Ciutadella',
      en: 'Arc de Triomf & Ciutadella Park',
      ca: 'Arc de Triomf i Parc de la Ciutadella',
      ar: 'قوس النصر وحديقة القلعة (سيتاديلا)'
    },
    category: 'monument',
    lat: 41.3917,
    lng: 2.1822,
    description: {
      es: 'Monumento de ladrillo rojo neomudéjar construido para la Exposición Universal de 1888, puerta de entrada al frondoso Parc de la Ciutadella.',
      en: 'Striking red-brick Neo-Mudéjar triumphal arch built for the 1888 World\'s Fair, serving as the grand gateway to the leafy Ciutadella park and its monumental fountain.',
      ca: 'Monument de maó vist neomudèjar de l\'Exposició Universal de 1888 i entrada al Parc de la Ciutadella.',
      ar: 'نصب تذكاري شاهق من الطوب الأحمر بني كبوابة رئيسية للمعرض العالمي عام 1888، ويقود مباشرة إلى حدائق وبحيرة حديقة القلعة الخلابة.'
    },
    tips: {
      es: 'Conexión directa con Rodalies R1/R3/R4 y Metro L1. En el parque se pueden alquilar barcas de remos.',
      en: 'Direct intermodal connection with Rodalies R1, R3, R4 and Metro L1. You can rent rowboats on the park lake.',
      ca: 'Connexió directa amb Rodalies i Metro L1. Al parc pots llogar barquetes.',
      ar: 'محطة تبادلية متكاملة لقطارات روداليس والمترو L1. يمكن استئجار قوارب تجديف في بحيرة الحديقة.'
    },
    nearestStationId: 'st-arc-triomf',
    nearestStationName: 'Arc de Triomf',
    walkingMinutes: 1,
    connectedLines: ['L1', 'R1', 'R3', 'R4'],
    imageCategory: 'monument'
  },
  {
    id: 'poi-museu-picasso',
    name: {
      es: 'Museu Picasso (El Born)',
      en: 'Picasso Museum (El Born)',
      ca: 'Museu Picasso (El Born)',
      ar: 'متحف بيكاسو (حي إل بورن)'
    },
    category: 'museum',
    lat: 41.3852,
    lng: 2.1809,
    description: {
      es: 'Albergado en cinco palacios medievales contiguos en el bohemio barrio de El Born, custodia más de 4.200 obras de juventud y la serie Las Meninas de Picasso.',
      en: 'Housed within five linked medieval Gothic palaces in El Born, showcasing over 4,200 formative works highlighting Pablo Picasso\'s deep connection with Barcelona.',
      ca: 'Instal·lat en cinc palaus gòtics del barri del Born, acull una col·lecció clau dels anys de formació de Picasso.',
      ar: 'يقع داخل خمسة قصور أثرية مترابطة في حي إل بورن التاريخي، ويضم أكثر من 4200 عمل فني نادر للفنان العالمي بابلو بيكاسو.'
    },
    tips: {
      es: 'Caminar desde Jaume I (L4). Entrada gratuita los jueves por la tarde y el primer domingo de cada mes (con reserva previa).',
      en: 'Short walk from Jaume I (L4). Free admission on Thursday afternoons and first Sunday of the month with online reservation.',
      ca: 'A 5 minuts de Jaume I (L4). Entrada gratuïta dijous a la tarda i primers diumenges de mes amb reserva.',
      ar: 'على مسافة 4 دقائق سيراً من محطة Jaume I (L4). الدخول مجاني مساء أيام الخميس مع ضرورة الحجز المسبق.'
    },
    nearestStationId: 'st-via-laietana',
    nearestStationName: 'Jaume I',
    walkingMinutes: 4,
    connectedLines: ['L4', 'V15'],
    imageCategory: 'culture'
  },
  {
    id: 'poi-tibidabo',
    name: {
      es: 'Tibidabo y Temple del Sagrat Cor',
      en: 'Tibidabo Mount & Sacred Heart Temple',
      ca: 'Tibidabo i Temple del Sagrat Cor',
      ar: 'قمة تيبيدابو وكنيسة القلب المقدس'
    },
    category: 'viewpoint',
    lat: 41.4225,
    lng: 2.1186,
    description: {
      es: 'El punto más elevado de la sierra de Collserola (512 metros), coronado por la monumental iglesia del Sagrat Cor y un centenario parque de atracciones.',
      en: 'The highest summit of the Collserola ridge (512m) overlooking Barcelona and the sea, crowned by the grand Sagrat Cor basilica and a historic 1901 amusement park.',
      ca: 'El cim més alt de Collserola amb el temple monumental i el parc d\'atraccions històric.',
      ar: 'أعلى قمة جبلية تشرف على برشلونة بارتفاع 512 متراً، تتوجها كنيسة القلب المقدس العملاقة وأقدم مدينة ملاهٍ تاريخية في إسبانيا.'
    },
    tips: {
      es: 'Tomar FGC S1 o S2 hasta Peu del Funicular y enlazar con el funicular de Vallvidrera o autobús V15.',
      en: 'Take FGC train S1 or S2 to Peu del Funicular station, then connect with the Vallvidrera Funicular or Bus V15.',
      ca: 'Agafa FGC S1 o S2 fins a Peu del Funicular i connecta amb el Funicular de Vallvidrera.',
      ar: 'استقل قطار FGC S1 أو S2 إلى محطة Peu del Funicular، ثم اربط مع الفونيكولار أو الحافلة V15.'
    },
    nearestStationId: 'st-gracia',
    nearestStationName: 'FGC Gràcia / Tibidabo',
    walkingMinutes: 15,
    connectedLines: ['S1', 'S2', 'V15'],
    imageCategory: 'viewpoint'
  }
];
