const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// TODO: BACKEND — replace with real pricing engine API
export async function getMarketComparison(craftTypeId) {
  await delay(800);
  
  return [
    {
      id: 'c1',
      imageUrl: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=200&q=80',
      price: 4800,
    },
    {
      id: 'c2',
      imageUrl: 'https://images.unsplash.com/photo-1544644558-52264bd9d554?w=200&q=80',
      price: 5500,
    },
    {
      id: 'c3',
      imageUrl: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=200&q=80',
      price: 6200,
    }
  ];
}
