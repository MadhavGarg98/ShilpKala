// Unsplash avatar source: https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=300&q=80
const ramniwasAvatar = require('../../assets/images/avatars/ramniwas.jpg');

export const mockArtisan = {
  id: 'artisan-123',
  name: 'Ram Niwas',
  nameHindi: 'राम निवास',
  nameEnglish: 'Ram Niwas',
  phone: '+919876543210',
  craftType: 'Handloom Weaving',
  craftTypeKey: 'craft.handloom.label',
  location: 'Varanasi, Uttar Pradesh',
  artisanIdStatus: 'Verified', // Verified, Pending, None
  profileImageUrl: ramniwasAvatar,
  image: ramniwasAvatar,
  isProfileComplete: true,
};

export default mockArtisan;
