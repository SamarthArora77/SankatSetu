import 'dotenv/config';
import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env';
import { connectDB, disconnectDB } from '../config/db';
import { User } from '../models/User';
import { Emergency } from '../models/Emergency';
import { Mission } from '../models/Mission';
import { Resource } from '../models/Resource';
import { ReliefCamp } from '../models/ReliefCamp';
import { Donation } from '../models/Donation';
import { VolunteerTask } from '../models/VolunteerTask';
import { Alert } from '../models/Alert';
import { Notification } from '../models/Notification';
import { AuditLog } from '../models/AuditLog';
import { sha256 } from '../utils/crypto';
import { generateTrackingToken } from '../utils/ids';

const generatedPassword = !env.SEED_DEMO_PASSWORD;
const DEMO_PASSWORD = env.SEED_DEMO_PASSWORD || `Ss-${randomBytes(12).toString('base64url')}-7a`;
const BCRYPT_ROUNDS = 12;

// Demo geography: relief operations around a riverfront district.
const CITY = { lat: 28.6139, lng: 77.209 };
function offsetLat(delta: number) {
  return CITY.lat + delta;
}
function offsetLng(delta: number) {
  return CITY.lng + delta;
}
function point(lat: number, lng: number) {
  return { type: 'Point' as const, coordinates: [lng, lat] };
}

async function clearDatabase() {
  await Promise.all([
    User.deleteMany({}),
    Emergency.deleteMany({}),
    Mission.deleteMany({}),
    Resource.deleteMany({}),
    ReliefCamp.deleteMany({}),
    Donation.deleteMany({}),
    VolunteerTask.deleteMany({}),
    Alert.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
  ]);
}

async function seed() {
  console.log(`[seed] Connecting to ${env.MONGODB_URI} ...`);
  await connectDB();
  console.log('[seed] Clearing existing collections...');
  await clearDatabase();

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  console.log('[seed] Creating demo users...');
  const [admin, responderAsha, responderVikram, ngo, volunteerMeera, donorRohan, citizenKavya] = await User.create([
    {
      name: 'Aarav Sharma',
      email: 'admin@sankatsetu.demo',
      passwordHash,
      role: 'ADMIN',
      phone: '+91 90000 00001',
    },
    {
      name: 'Asha Verma',
      email: 'responder.asha@sankatsetu.demo',
      passwordHash,
      role: 'RESPONDER',
      phone: '+91 90000 00002',
      responderProfile: {
        team: 'Rapid Response Unit 1',
        vehicleType: 'AMBULANCE',
        status: 'DISPATCHED',
        currentLocation: point(offsetLat(0.01), offsetLng(0.01)),
        equipment: ['First-aid kits', 'Oxygen cylinders', 'Stretcher'],
      },
    },
    {
      name: 'Vikram Singh',
      email: 'responder.vikram@sankatsetu.demo',
      passwordHash,
      role: 'RESPONDER',
      phone: '+91 90000 00003',
      responderProfile: {
        team: 'Water Rescue Team 2',
        vehicleType: 'RESCUE_BOAT',
        status: 'ON_SCENE',
        currentLocation: point(offsetLat(-0.015), offsetLng(0.02)),
        equipment: ['Rescue boat', 'Life jackets', 'Rope kits'],
      },
    },
    {
      name: 'Hope Foundation',
      email: 'ngo@sankatsetu.demo',
      passwordHash,
      role: 'NGO',
      phone: '+91 90000 00004',
      organization: 'Hope Foundation Trust',
    },
    {
      name: 'Meera Iyer',
      email: 'volunteer.meera@sankatsetu.demo',
      passwordHash,
      role: 'VOLUNTEER',
      phone: '+91 90000 00005',
    },
    {
      name: 'Rohan Kapoor',
      email: 'donor.rohan@sankatsetu.demo',
      passwordHash,
      role: 'DONOR',
      phone: '+91 90000 00006',
    },
    {
      name: 'Kavya Nair',
      email: 'citizen.kavya@sankatsetu.demo',
      passwordHash,
      role: 'CITIZEN',
      phone: '+91 90000 00007',
    },
  ]);

  console.log('[seed] Creating relief camps...');
  const [campGanga, campYamuna] = await ReliefCamp.create([
    {
      name: 'Ganga Nagar Relief Camp',
      location: point(offsetLat(0.03), offsetLng(0.03)),
      address: 'Ganga Nagar Sports Ground, Relief Road',
      capacity: 500,
      currentOccupancy: 320,
      availableServices: ['Food', 'Drinking water', 'Medical post', 'Blankets'],
      status: 'OPEN',
      contactPerson: 'Dr. Neelam Gupta',
      contactPhone: '+91 90000 00101',
      suppliesStatus: 'ADEQUATE',
      hasMedicalPost: true,
      hasDrinkingWater: true,
      hasPowerBackup: true,
    },
    {
      name: 'Yamuna Bank Camp',
      location: point(offsetLat(-0.02), offsetLng(0.045)),
      address: 'Yamuna Bank Community Hall',
      capacity: 250,
      currentOccupancy: 250,
      availableServices: ['Food', 'Shelter'],
      status: 'FULL',
      contactPerson: 'Imran Qureshi',
      contactPhone: '+91 90000 00102',
      suppliesStatus: 'CRITICAL_SHORTAGE',
      hasMedicalPost: false,
      hasDrinkingWater: true,
      hasPowerBackup: false,
    },
    {
      name: 'Riverside School Shelter',
      location: point(offsetLat(0.015), offsetLng(-0.025)),
      address: 'Riverside Public School, Sector 4',
      capacity: 180,
      currentOccupancy: 96,
      availableServices: ['Food', 'Drinking water', 'Power backup'],
      status: 'OPEN',
      contactPerson: 'Sunita Rao',
      contactPhone: '+91 90000 00103',
      suppliesStatus: 'RESTOCK_EN_ROUTE',
      hasMedicalPost: false,
      hasDrinkingWater: true,
      hasPowerBackup: true,
    },
  ]);

  console.log('[seed] Creating emergency reports...');
  const emergencySpecs = [
    {
      ticketId: 'RS-900101',
      title: 'Family stranded on rooftop — rising floodwater',
      description:
        'Water has reached the first floor of our building on Bank Street. Six people including two children are on the roof. The current is strong and we cannot swim to safety.',
      category: ['FLOOD', 'RESCUE'],
      urgency: 'CRITICAL',
      status: 'PENDING',
      verificationStatus: 'UNVERIFIED',
      lat: offsetLat(0.011),
      lng: offsetLng(0.012),
      address: '14 Bank Street, Ganga Nagar',
      landmark: 'Opposite the old clock tower',
      peopleCount: 6,
      reporterName: 'Kavya Nair',
      reporterPhone: '+91 90000 00007',
      reportedBy: citizenKavya.id,
      trustScore: 35,
      trustSignals: ['Callback phone number supplied', 'Detailed free-text description supplied'],
    },
    {
      ticketId: 'RS-900102',
      title: 'Warehouse fire spreading toward residences',
      description:
        'A chemical warehouse caught fire and flames are spreading toward the adjacent residential lane. Several residents have smoke inhalation and need medical screening.',
      category: ['FIRE', 'MEDICAL'],
      urgency: 'CRITICAL',
      status: 'VERIFIED',
      verificationStatus: 'VERIFIED',
      lat: offsetLat(-0.008),
      lng: offsetLng(0.018),
      address: 'Plot 7, Industrial Estate Phase II',
      peopleCount: 12,
      reporterName: 'Night watchman (verified by EOC)',
      reportedBy: undefined,
      trustScore: 80,
      trustSignals: ['Corroborated by 3 independent reports', 'Human verification approved by Aarav Sharma'],
    },
    {
      ticketId: 'RS-900103',
      title: 'Elderly resident needs evacuation from flooded lane',
      description:
        'My neighbour is 82 years old and alone on the ground floor. Water is knee deep inside the house and her medication is running out.',
      category: ['FLOOD', 'MEDICAL'],
      urgency: 'HIGH',
      status: 'ASSIGNED',
      verificationStatus: 'VERIFIED',
      lat: offsetLat(0.006),
      lng: offsetLng(-0.011),
      address: 'Lane 3, Krishna Colony',
      peopleCount: 1,
      reporterName: 'Rohan Kapoor',
      reporterPhone: '+91 90000 00006',
      reportedBy: donorRohan.id,
      trustScore: 70,
      trustSignals: ['Submitted from an authenticated account', 'Callback phone number supplied'],
      assignedResponder: responderAsha.id,
      assignedResponderName: responderAsha.name,
      assignedAt: new Date(Date.now() - 25 * 60 * 1000),
    },
    {
      ticketId: 'RS-900104',
      title: 'Boat capsized — swimmers in the river',
      description:
        'A private boat carrying five people capsized near the old bridge. Two people are holding onto debris; the others were swept toward the east bank.',
      category: ['RESCUE', 'FLOOD'],
      urgency: 'CRITICAL',
      status: 'IN_PROGRESS',
      verificationStatus: 'VERIFIED',
      lat: offsetLat(-0.017),
      lng: offsetLng(0.021),
      address: 'Old Yamuna Bridge, east pier',
      landmark: 'Near the old bridge pump house',
      peopleCount: 5,
      reporterName: 'Fisherman on east bank',
      trustScore: 85,
      trustSignals: ['Photo or voice evidence attached', 'Corroborated by 2 independent reports'],
      assignedResponder: responderVikram.id,
      assignedResponderName: responderVikram.name,
      assignedAt: new Date(Date.now() - 40 * 60 * 1000),
    },
    {
      ticketId: 'RS-900105',
      title: 'Power lines down after storm',
      description: 'A large tree fell across the main road and brought down power lines. The road is blocked for ambulances.',
      category: ['POWER_COMMS'],
      urgency: 'MEDIUM',
      status: 'RESOLVED',
      verificationStatus: 'VERIFIED',
      lat: offsetLat(0.02),
      lng: offsetLng(0.005),
      address: 'MG Road, Sector 2',
      peopleCount: 0,
      isAnonymous: true,
      reporterName: undefined,
      trustScore: 60,
      trustSignals: ['Human verification approved by Aarav Sharma'],
      resolvedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
    {
      ticketId: 'RS-900106',
      title: 'Duplicate test report (drill data)',
      description: 'This report was filed during a coordination drill and was rejected during verification.',
      category: ['OTHER'],
      urgency: 'LOW',
      status: 'REJECTED',
      verificationStatus: 'REJECTED',
      lat: offsetLat(0.04),
      lng: offsetLng(0.04),
      address: 'Drill site, Training Ground',
      peopleCount: 1,
      isAnonymous: true,
      reporterName: undefined,
      trustScore: 10,
      trustSignals: ['Report rejected during human verification by Aarav Sharma'],
    },
  ] as const;

  const trackingTokens: Record<string, string> = {};
  const emergencies = [];
  for (const spec of emergencySpecs) {
    const { lat, lng, isAnonymous, ...rest } = spec as unknown as Record<string, unknown> & {
      lat: number;
      lng: number;
      isAnonymous?: boolean;
    };
    const token = generateTrackingToken();
    trackingTokens[String(rest.ticketId)] = token;
    emergencies.push(
      await Emergency.create({
        ...(rest as Record<string, unknown>),
        location: point(lat, lng),
        isAnonymous: isAnonymous ?? false,
        isForOther: false,
        peopleCount: typeof rest.peopleCount === 'number' && rest.peopleCount > 0 ? rest.peopleCount : 1,
        corroboratingReportCount: 0,
        trackingTokenHash: sha256(token),
      }),
    );
  }

  const [, , emAssigned, emInProgress] = emergencies;

  console.log('[seed] Creating missions...');
  const missionAssigned = await Mission.create({
    emergency: emAssigned.id,
    responder: responderAsha.id,
    status: 'ASSIGNED',
    notes: 'Evacuate the elderly resident and deliver medication.',
    acceptedAt: new Date(Date.now() - 25 * 60 * 1000),
  });
  emAssigned.assignedMission = missionAssigned.id;
  await emAssigned.save();

  const missionRescue = await Mission.create({
    emergency: emInProgress.id,
    responder: responderVikram.id,
    status: 'ARRIVED',
    notes: 'On scene at east pier; two people recovered, searching for remaining three.',
    acceptedAt: new Date(Date.now() - 40 * 60 * 1000),
    enRouteAt: new Date(Date.now() - 35 * 60 * 1000),
    arrivedAt: new Date(Date.now() - 10 * 60 * 1000),
  });
  emInProgress.assignedMission = missionRescue.id;
  await emInProgress.save();

  console.log('[seed] Creating resource inventory...');
  await Resource.create([
    {
      name: 'Packaged Drinking Water (1L bottles)',
      category: 'WATER',
      quantity: 10000,
      availableQuantity: 8200,
      unit: 'bottles',
      owner: ngo.id,
      organizationName: 'Hope Foundation Trust',
      warehouseName: 'Hope Foundation Central Warehouse',
      location: point(offsetLat(0.05), offsetLng(0.02)),
      status: 'ACTIVE',
      criticalThreshold: 1500,
    },
    {
      name: 'Rice & Dry Ration Kits',
      category: 'FOOD',
      quantity: 2500,
      availableQuantity: 1980,
      unit: 'kits',
      owner: ngo.id,
      organizationName: 'Hope Foundation Trust',
      warehouseName: 'Hope Foundation Central Warehouse',
      location: point(offsetLat(0.05), offsetLng(0.02)),
      status: 'ACTIVE',
      criticalThreshold: 400,
    },
    {
      name: 'First-Aid Kits',
      category: 'MEDICAL_KIT',
      quantity: 300,
      availableQuantity: 120,
      unit: 'kits',
      owner: ngo.id,
      organizationName: 'Hope Foundation Trust',
      warehouseName: 'Sector 4 Distribution Point',
      location: point(offsetLat(0.016), offsetLng(-0.026)),
      status: 'ACTIVE',
      criticalThreshold: 100,
    },
    {
      name: 'Inflatable Rescue Boats',
      category: 'BOAT',
      quantity: 12,
      availableQuantity: 5,
      unit: 'boats',
      owner: ngo.id,
      organizationName: 'Hope Foundation Trust',
      warehouseName: 'River Depot',
      location: point(offsetLat(-0.014), offsetLng(0.03)),
      status: 'ACTIVE',
      criticalThreshold: 2,
    },
  ]);

  console.log('[seed] Creating volunteer tasks...');
  const joinedAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
  await VolunteerTask.create([
    {
      title: 'Ration distribution at Ganga Nagar camp',
      description:
        'Distribute dry ration kits to families at Ganga Nagar Relief Camp. Shift leads will brief volunteers on crowd management at check-in.',
      category: 'DISTRIBUTION',
      urgency: 'HIGH',
      location: campGanga.location,
      locationName: campGanga.name,
      requiredVolunteers: 12,
      assignedVolunteers: [{ volunteer: volunteerMeera.id, joinedAt }],
      status: 'IN_PROGRESS',
      timeEstimate: '4 hours',
      createdBy: admin.id,
    },
    {
      title: 'Medical triage support at Yamuna Bank',
      description:
        'Assist the medical post with registration and triage of residents arriving at Yamuna Bank Camp. Basic first-aid certification preferred.',
      category: 'FIRST_AID',
      urgency: 'CRITICAL',
      location: campYamuna.location,
      locationName: campYamuna.name,
      requiredVolunteers: 6,
      assignedVolunteers: [],
      status: 'OPEN',
      timeEstimate: '6 hours',
      createdBy: admin.id,
    },
  ]);

  console.log('[seed] Creating donations with tracking...');
  const donationTokenA = generateTrackingToken();
  const donationTokenB = generateTrackingToken();
  await Donation.create([
    {
      trackingId: 'RS-DON-K7P2QX',
      trackingTokenHash: sha256(donationTokenA),
      donor: donorRohan.id,
      donorName: donorRohan.name,
      donorEmail: donorRohan.email,
      donationType: 'SUPPLIES',
      itemDescription: '200 family hygiene kits and 500 mosquito nets',
      amountOrQuantity: '200 hygiene kits, 500 nets',
      quantity: 700,
      pickupLocation: point(offsetLat(0.09), offsetLng(0.07)),
      destination: campGanga.name,
      allocatedCamp: campGanga.id,
      allocatedCampName: campGanga.name,
      status: 'IN_TRANSIT',
      currentLocation: 'Highway checkpoint 4',
      trackingEvents: [
        {
          status: 'REGISTERED',
          location: 'Donor warehouse, Noida',
          notes: 'Donation registered by donor.',
          verifiedBy: donorRohan.id,
          verifiedByName: donorRohan.name,
          at: new Date(Date.now() - 26 * 60 * 60 * 1000),
        },
        {
          status: 'COLLECTED',
          location: 'Donor warehouse, Noida',
          notes: 'Picked up by Hope Foundation logistics van.',
          verifiedBy: ngo.id,
          verifiedByName: 'Hope Foundation Trust',
          at: new Date(Date.now() - 20 * 60 * 60 * 1000),
        },
        {
          status: 'IN_TRANSIT',
          location: 'Highway checkpoint 4',
          notes: 'En route to Ganga Nagar Relief Camp.',
          verifiedBy: ngo.id,
          verifiedByName: 'Hope Foundation Trust',
          at: new Date(Date.now() - 5 * 60 * 60 * 1000),
        },
      ],
    },
    {
      trackingId: 'RS-DON-M4T8RW',
      trackingTokenHash: sha256(donationTokenB),
      donor: undefined,
      donorName: 'Anonymous donor',
      donationType: 'MONETARY',
      itemDescription: 'Monetary contribution toward water purification tablets',
      amountOrQuantity: 'INR 25,000',
      destination: campYamuna.name,
      allocatedCamp: campYamuna.id,
      allocatedCampName: campYamuna.name,
      status: 'REGISTERED',
      currentLocation: 'SankatSetu coordination desk',
      trackingEvents: [
        {
          status: 'REGISTERED',
          location: 'SankatSetu coordination desk',
          notes: 'Contribution recorded; procurement of purification tablets pending.',
          verifiedBy: admin.id,
          verifiedByName: admin.name,
          at: new Date(Date.now() - 8 * 60 * 60 * 1000),
        },
      ],
    },
  ]);

  console.log('[seed] Creating public alert...');
  await Alert.create({
    title: 'Evacuation ordered for Yamuna Bank low-lying areas',
    message:
      'Authorities have ordered immediate evacuation of low-lying blocks near Yamuna Bank as water levels continue to rise. Proceed to Yamuna Bank Camp or Riverside School Shelter. Carry identity documents and essential medicines.',
    severity: 'CRITICAL_EVACUATION',
    affectedZones: ['Yamuna Bank', 'Krishna Colony', 'Sector 4 Riverside'],
    issuedAt: new Date(Date.now() - 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    isActive: true,
    createdBy: admin.id,
  });

  console.log('[seed] Done.\n');
  console.log('=== SankatSetu demo dataset ===');
  console.log(
    generatedPassword
      ? `Generated demo password for every account: ${DEMO_PASSWORD}\n`
      : 'Demo password for every account: the value of SEED_DEMO_PASSWORD.\n',
  );
  console.log('Accounts:');
  for (const u of [admin, responderAsha, responderVikram, ngo, volunteerMeera, donorRohan, citizenKavya]) {
    console.log(`  ${u.role.padEnd(10)} ${u.email}`);
  }
  console.log('\nEmergency tracking tickets (ticketId -> tracking token):');
  for (const spec of emergencySpecs) {
    const token = trackingTokens[spec.ticketId];
    console.log(`  ${spec.ticketId}  ${spec.status.padEnd(11)} ${spec.title.slice(0, 52)}`);
    console.log(`      tracking token: ${token}`);
  }
  console.log('\nDonation tracking:');
  console.log('  RS-DON-K7P2QX  token:', donationTokenA);
  console.log('  RS-DON-M4T8RW  token:', donationTokenB);
  console.log('\nNote: AI assessment fields are intentionally left empty. Run POST /api/v1/emergencies/:id/analyze');
  console.log('with GEMINI_API_KEY configured to generate a real assessment.\n');
}

seed()
  .catch((error) => {
    console.error('[seed] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDB().catch(() => mongoose.disconnect());
  });
