// Unsplash source: https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80
const handloomImg = require('../../assets/images/craft-types/handloom-weaving.jpg');

// Unsplash source: https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=600&q=80
const clayImg = require('../../assets/images/craft-types/clay-pottery.jpg');

// Unsplash source: https://images.unsplash.com/photo-1606744837616-56c9a5c6a6eb?auto=format&fit=crop&w=600&q=80
const blockprintImg = require('../../assets/images/craft-types/block-print.jpg');

// Unsplash source: https://images.unsplash.com/photo-1544644558-52264bd9d554?auto=format&fit=crop&w=600&q=80
const woodImg = require('../../assets/images/craft-types/wood-carving.jpg');

// Unsplash source: https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=600&q=80
const zardoziImg = require('../../assets/images/craft-types/zardozi.jpg');

// Unsplash source: https://images.unsplash.com/photo-1582738411706-bfc8e691d1c2?auto=format&fit=crop&w=600&q=80
const brassImg = require('../../assets/images/craft-types/brass-metalwork.jpg');

export const mockCraftTypes = [
  {
    id: '1',
    labelKey: 'craft.handloom.label',
    giNameKey: 'craft.handloom.giName',
    heritageStoryKey: 'craft.handloom.heritageStory',
    labelHindi: 'हथकरघा बुनाई',
    labelEnglish: 'Handloom Weaving',
    hasGIMatch: true,
    giNameHindi: 'बनारस ब्रोकेड्स और साड़ियाँ',
    giNameEnglish: 'Banaras Brocades & Sarees (GI Reg #99)',
    heritageStoryHindi: '५०० वर्षों से चली आ रही शुद्ध रेशम और सुनहरी ज़री की कढ़ुआ बुनाई शैली, जो बनारस के बुनकरों की पहचान है।',
    heritageStoryEnglish: 'A 500-year-old weaving tradition utilizing pure mulberry silk and authentic zari in the historic kadhua technique of Varanasi.',
    imageUrl: handloomImg,
    image: handloomImg,
  },
  {
    id: '2',
    labelKey: 'craft.clay.label',
    giNameKey: 'craft.clay.giName',
    heritageStoryKey: 'craft.clay.heritageStory',
    labelHindi: 'मिट्टी के बर्तन',
    labelEnglish: 'Clay Pottery',
    hasGIMatch: true,
    giNameHindi: 'गोरखपुर टेराकोटा शिल्प',
    giNameEnglish: 'Gorakhpur Terracotta Craft (GI Reg #629)',
    heritageStoryHindi: 'प्राकृतिक लाल दोमट मिट्टी से बिना सांचे के हाथों से तराशी जाने वाली पारंपरिक टेराकोटा कला।',
    heritageStoryEnglish: 'Handcrafted centuries-old terracotta tradition shaped from natural riverbed alluvial clay without synthetic casts.',
    imageUrl: clayImg,
    image: clayImg,
  },
  {
    id: '3',
    labelKey: 'craft.blockprint.label',
    giNameKey: 'craft.blockprint.giName',
    heritageStoryKey: 'craft.blockprint.heritageStory',
    labelHindi: 'हैंड ब्लॉक प्रिंट',
    labelEnglish: 'Hand Block Print',
    hasGIMatch: true,
    giNameHindi: 'सांगानेरी हैंड ब्लॉक प्रिंट',
    giNameEnglish: 'Sanganer Hand Block Print (GI Reg #164)',
    heritageStoryHindi: 'शीशम की नक्काशीदार लकड़ी के ठप्पों और प्राकृतिक वानस्पतिक रंगों से शुद्ध सूती कपड़े पर छपाई।',
    heritageStoryEnglish: 'Hand-pressed delicate botanical motifs stamped with hand-carved teakwood blocks using pure herbal dyes.',
    imageUrl: blockprintImg,
    image: blockprintImg,
  },
  {
    id: '4',
    labelKey: 'craft.wood.label',
    giNameKey: 'craft.wood.giName',
    heritageStoryKey: 'craft.wood.heritageStory',
    labelHindi: 'लकड़ी की नक्काशी',
    labelEnglish: 'Wood Carving',
    hasGIMatch: true,
    giNameHindi: 'सहारनपुर लकड़ी शिल्प',
    giNameEnglish: 'Saharanpur Wood Craft (GI Reg #431)',
    heritageStoryHindi: 'एकल शीशम और शीशम की लकड़ी में जालीदार बारीक नक्काशी, जो मुग़ल वास्तुकला से प्रेरित है।',
    heritageStoryEnglish: 'Intricate openwork floral carving and brass inlay sculpted on seasoned sheesham and rosewood.',
    imageUrl: woodImg,
    image: woodImg,
  },
  {
    id: '5',
    labelKey: 'craft.zardozi.label',
    giNameKey: 'craft.zardozi.giName',
    heritageStoryKey: 'craft.zardozi.heritageStory',
    labelHindi: 'जरदोजी और कढ़ाई',
    labelEnglish: 'Zardozi & Embroidery',
    hasGIMatch: true,
    giNameHindi: 'लखनऊ जरदोजी शिल्प',
    giNameEnglish: 'Lucknow Zardozi (GI Reg #316)',
    heritageStoryHindi: 'शाही दरबारों की धातु की तारों, मोतियों और सितारों से मखमल व साटन पर हाथ से की जाने वाली कशीदाकारी।',
    heritageStoryEnglish: 'Imperial metallic gold and silver wire hand-embroidery sewn with ari needlework on fine velvets.',
    imageUrl: zardoziImg,
    image: zardoziImg,
  },
  {
    id: '6',
    labelKey: 'craft.brass.label',
    giNameKey: 'craft.brass.giName',
    heritageStoryKey: 'craft.brass.heritageStory',
    labelHindi: 'पीतल और धातु का काम',
    labelEnglish: 'Brass & Metalwork',
    hasGIMatch: false,
    giNameHindi: 'हस्तनिर्मित पीतल शिल्प',
    giNameEnglish: 'Handmade Brass Metalcraft',
    heritageStoryHindi: 'पीढ़ियों से संजोई गई पारंपरिक धातु ढलाई और नक्काशी तकनीक।',
    heritageStoryEnglish: 'Traditional sand-cast brass sculpted and engraved by master metal artisans.',
    imageUrl: brassImg,
    image: brassImg,
  },
];

export default mockCraftTypes;
