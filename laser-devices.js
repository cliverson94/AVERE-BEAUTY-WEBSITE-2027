// Laser device data. Specs researched from manufacturer/distributor sources; flagged items need clinical review before launch.
const WX = (id, w = 900, h = 900) => `https://static.wixstatic.com/media/${id}/v1/fill/w_${w},h_${h},al_c,q_85/img.jpg`;

export const TARGETS = {
  melanin: { label: 'Melanin', note: 'Hair follicles, sun spots, brown pigment', color: '#B07A4A' },
  hemoglobin: { label: 'Hemoglobin', note: 'Redness, rosacea, broken capillaries', color: '#C8475E' },
  water: { label: 'Water', note: 'Resurfacing, texture, fine lines, collagen', color: '#5E8FB0' },
  ink: { label: 'Tattoo ink', note: 'Breaks ink into particles the body clears', color: '#2B2226' },
};

export const WAVES = {
  532: { name: 'KTP / Nd:YAG 532', targets: ['hemoglobin', 'melanin', 'ink'], body: 'Green light. Absorbed by blood and surface pigment; clears red, orange and yellow ink.' },
  755: { name: 'Alexandrite 755', targets: ['melanin', 'ink'], body: 'The gold-standard hair removal wavelength. Strongly absorbed by melanin in the follicle and in sun spots.' },
  785: { name: 'Ti:Sapphire 785 (pico)', targets: ['melanin', 'ink'], body: 'Picosecond pulses shatter pigment with very little heat. Used for blue and green ink and skin brightening.' },
  1064: { name: 'Nd:YAG 1064', targets: ['melanin', 'hemoglobin', 'ink'], body: 'Penetrates deepest and bypasses surface melanin, which makes it the safer choice for darker skin tones.' },
  1927: { name: 'Thulium 1927 (MOXI)', targets: ['water'], body: 'Gentle, superficial fractional energy for tone, texture and early sun damage.', review: true },
  2940: { name: 'Er:YAG 2940', targets: ['water'], body: 'Erbium is absorbed almost entirely by water at the surface for light resurfacing.', review: true },
  10600: { name: 'CO2 10,600', targets: ['water'], body: 'CO2 vaporizes a thin layer of skin to resurface texture, lines, scars and pores.' },
};

export const BANDS = {
  bbl: { name: 'BroadBand Light', from: 420, to: 1400, targets: ['melanin', 'hemoglobin'], body: 'Filtered broadband light tuned to brown spots and redness in one pass.' },
  ipl: { name: 'Twain chilled IPL', from: 500, to: 1200, targets: ['melanin', 'hemoglobin'], body: 'Intense pulsed light for spots, redness and photofacials.', review: true },
};

export const AXES = [['speed', 'Treatment speed'], ['comfort', 'Comfort'], ['skin', 'Skin-tone range'], ['versatility', 'Versatility'], ['recovery', 'Quick recovery']];

export const DEVICES = [
  {
    id: 'motus', name: 'MOTUS AZ+', maker: 'DEKA', cartessa: true, file: 'Avere Laser Device.dc.html?d=motus',
    tagline: 'Near-painless hair removal, all year round.',
    img: WX('903d63_0e21aa05ff9547bfabc72252e25ddcbd~mv2.jpg'),
    locs: ['Lawrenceville'],
    waves: [755, 1064], bands: [],
    treatments: [['Laser hair removal', 'Laser Hair Removal.dc.html'], ['Pigmentation', 'Avere Lasers.dc.html#pigmentation'], ['Vascular laser', 'Avere Lasers.dc.html#vascular-laser']],
    features: [['Moveo technology', 'The handpiece glides continuously, building heat gradually instead of single hard pulses, so most clients describe it as warm rather than snapping.'], ['Two wavelengths', 'Alexandrite for fine and light-brown hair, Nd:YAG for deeper follicles and darker skin.'], ['Treat when tanned', 'The gradual-heat delivery is designed to allow treatment on sun-exposed skin.']],
    radar: { speed: 5, comfort: 5, skin: 5, versatility: 3, recovery: 5 },
    review: ['"Treat when tanned" claim', 'Radar scores are editorial'],
  },
  {
    id: 'evo', name: 'EVO Quantum Series', maker: 'Quanta System', cartessa: true, file: 'Avere Laser Device.dc.html?d=evo',
    tagline: 'One Italian-built platform for hair, spots, veins and glow.',
    img: WX('903d63_c5d1018459414f6f8bd1e32b8e7acda1~mv2.png'),
    locs: ['Murrysville'],
    waves: [532, 755, 1064], bands: ['ipl'],
    treatments: [['Laser hair removal', 'Laser Hair Removal.dc.html'], ['Laser facial', 'Avere Lasers.dc.html#laser-facial'], ['IPL photofacial', 'Avere IPL.dc.html'], ['Pigmentation', 'Avere Lasers.dc.html#pigmentation'], ['Vascular laser', 'Avere Lasers.dc.html#vascular-laser']],
    features: [['Three true laser wavelengths', '532, 755 and 1064 nm in one system, so one visit can target pigment, redness and hair.'], ['Chilled IPL handpiece', 'Adds broadband light for photofacials and sun damage.'], ['Combination passes', 'Wavelengths can be layered in one session to treat blood, melanin and texture at different depths.']],
    radar: { speed: 4, comfort: 3, skin: 5, versatility: 5, recovery: 4 },
    review: ['Confirm exact EVO model & handpieces on site (Light 4V / A-Star / Q-Plus)', 'IPL band range', 'Radar scores are editorial'],
  },
  {
    id: 'tetra', name: 'SmartXide Tetra', maker: 'DEKA', cartessa: true, file: 'Avere Laser Device.dc.html?d=tetra',
    tagline: 'The CO2 laser behind CoolPeel.',
    img: WX('903d63_acb3a5de6ca04fe5b944945d679e7468~mv2.jpg'),
    locs: ['Lawrenceville', 'Murrysville'],
    waves: [10600], bands: [],
    treatments: [['CoolPeel', 'Avere CoolPeel.dc.html'], ['Fine lines & texture', 'Avere CoolPeel.dc.html'], ['Acne scars', 'Avere CoolPeel.dc.html']],
    features: [['Short, high-energy pulses', 'Delivers energy fast enough to resurface without the lingering heat of older CO2 lasers.'], ['CoolPeel exclusive', 'CoolPeel can only be performed on Tetra.'], ['Adjustable depth', 'Ranges from a light surface peel to deeper resurfacing for scars.']],
    radar: { speed: 4, comfort: 3, skin: 2, versatility: 3, recovery: 3 },
    review: ['Radar scores are editorial'],
  },
  {
    id: 'toro', name: 'DEKA Toro', maker: 'DEKA', cartessa: true, file: 'Avere Laser Device.dc.html?d=toro',
    tagline: 'Pico and nano power for every ink color.',
    img: WX('903d63_6719fc12e7124029a20b71a0034e89fc~mv2.webp'),
    locs: ['Lawrenceville'],
    waves: [532, 785, 1064], bands: [],
    treatments: [['Tattoo removal', 'Avere Tattoo Removal.dc.html'], ['Pigmentation', 'Avere Lasers.dc.html#pigmentation'], ['Laser facial', 'Avere Lasers.dc.html#laser-facial']],
    features: [['Four pulse modes', 'Picosecond, nanosecond, double-pulse and thermal, matched to ink depth, pigment type or collagen goals.'], ['Three wavelengths', '1064 for black and blue ink, 532 for red and orange, 785 pico for blue and green.'], ['Square handpieces', 'Even energy across the spot for uniform clearing.']],
    radar: { speed: 4, comfort: 3, skin: 5, versatility: 4, recovery: 4 },
    review: ['Radar scores are editorial'],
  },
  {
    id: 'mjoule', name: 'Sciton mJOULE BBL', maker: 'Sciton', cartessa: false, file: 'Avere Laser Device.dc.html?d=mjoule',
    tagline: 'BroadBand Light for spots and redness.',
    img: WX('903d63_e00398ff077e40a3b0082687558b986a~mv2_d_3198_2270_s_2.jpg'),
    locs: ['Cranberry'],
    waves: [1927], bands: ['bbl'],
    treatments: [['BBL photofacial', 'Avere IPL.dc.html'], ['Sun & age spots', 'Avere IPL.dc.html'], ['Redness & rosacea', 'Avere IPL.dc.html']],
    features: [['BroadBand Light', 'Filters tune the light to brown spots, redness or overall tone.'], ['MOXI handpiece', 'A gentle 1927 nm fractional laser for texture and early sun damage.'], ['Two-in-one platform', 'BBL and MOXI can be combined in one visit.']],
    radar: { speed: 4, comfort: 4, skin: 2, versatility: 3, recovery: 5 },
    review: ['Confirm MOXI handpiece is on site', 'Radar scores are editorial'],
  },
];
