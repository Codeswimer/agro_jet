"""Seed the database with AGRO JET demo data.

Usage:
    python manage.py seed_demo            # create anything missing
    python manage.py seed_demo --flush    # wipe marketplace + demo users first
"""
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from marketplace.models import (
    AgriInput,
    CorporateBuyer,
    EscrowContract,
    ImportPool,
    ProduceListing,
)

User = get_user_model()

DEMO_PASSWORD = 'AgroJet2026!'

BUYERS = [
    {
        'company_name': 'Nestlé Food Processing Plant',
        'industry': 'FMCG / Food & Beverage',
        'raw_material_needed': 'Non-GMO Grain Maize (Yellow/White)',
        'monthly_volume_req': '800 MT / Month',
        'offer_price': '₦490,000 / MT',
        'unit_price_numeric': Decimal('490000'),
        'location': 'Agbara Industrial Zone, Ogun State',
        'quality_specs': ['Moisture < 12%', 'Aflatoxin < 10 ppb', 'Impurity < 1%'],
        'escrow_deposit_locked': '$120,000 USD (BMONI Escrow)',
        'contact_person': 'Procurement Desk - Grains',
        'category': CorporateBuyer.Category.MAIZE,
    },
    {
        'company_name': 'Psaltry International Starch Ltd',
        'industry': 'Industrial Starch & Alcohol',
        'raw_material_needed': 'Fresh Cassava Roots (High Starch Content)',
        'monthly_volume_req': '2,500 MT / Month',
        'offer_price': '₦195,000 / MT',
        'unit_price_numeric': Decimal('195000'),
        'location': 'Ado-Awaye, Oyo State',
        'quality_specs': ['Starch Content > 25%', 'Harvested within 24hrs', 'Cyanide Low'],
        'escrow_deposit_locked': '₦150,000,000 NGN (cNGN Locked)',
        'contact_person': 'Raw Materials Sourcing Team',
        'category': CorporateBuyer.Category.CASSAVA,
    },
    {
        'company_name': 'Olam Agri Processing Mills',
        'industry': 'Edible Oils & Animal Feed',
        'raw_material_needed': 'Raw Soybeans (Industrial Grade)',
        'monthly_volume_req': '1,200 MT / Month',
        'offer_price': '₦850,000 / MT',
        'unit_price_numeric': Decimal('850000'),
        'location': 'Kaduna Industrial Layout, Kaduna State',
        'quality_specs': ['Oil content > 18%', 'Foreign matter < 2%', 'Splits < 5%'],
        'escrow_deposit_locked': '$250,000 USD (BMONI Escrow)',
        'contact_person': 'Agri Supply Chain Lead',
        'category': CorporateBuyer.Category.SOYBEANS,
    },
    {
        'company_name': 'Grand Cereals & Feeds (UAC)',
        'industry': 'Livestock & Poultry Feed',
        'raw_material_needed': 'Cleaned Yellow Maize & Sorghum',
        'monthly_volume_req': '600 MT / Month',
        'offer_price': '₦475,000 / MT',
        'unit_price_numeric': Decimal('475000'),
        'location': 'Jos, Plateau State',
        'quality_specs': ['Moisture < 13%', 'Cleaned & Destoned'],
        'escrow_deposit_locked': '₦80,000,000 NGN (cNGN Locked)',
        'contact_person': 'Feed Mill Grains Procurement',
        'category': CorporateBuyer.Category.MAIZE,
    },
    {
        'company_name': 'Tolaram Nutri-Beverages Exporters',
        'industry': 'Export & Oil Extraction',
        'raw_material_needed': 'White Sesame Seeds (Grade A Cleaned)',
        'monthly_volume_req': '300 MT / Month',
        'offer_price': '₦1,380,000 / MT',
        'unit_price_numeric': Decimal('1380000'),
        'location': 'Kano Free Trade Zone, Kano',
        'quality_specs': ['Purity > 99%', 'Admixture < 1%', 'Oil content > 50%'],
        'escrow_deposit_locked': '$180,000 USD (BMONI Escrow)',
        'contact_person': 'Export Commodity Desk',
        'category': CorporateBuyer.Category.SESAME,
    },
]

PRODUCE = [
    {
        'email': 'ogun.coop@agrojet.africa',
        'first_name': 'Ogun', 'last_name': 'Coop',
        'crop': 'Cleaned Yellow Maize (Grade A)',
        'volume_available': Decimal('150'), 'price_per_unit': Decimal('450000'),
        'location': 'Ilaro, Ogun State',
        'specs': ['Moisture < 12%', 'Aflatoxin Safe', 'Bags in 50kg PP'],
        'rating': Decimal('4.9'),
    },
    {
        'email': 'greenfields@agrojet.africa',
        'first_name': 'Greenfields', 'last_name': 'Outgrowers',
        'crop': 'Fresh High-Starch Cassava Tubers',
        'volume_available': Decimal('300'), 'price_per_unit': Decimal('180000'),
        'location': 'Abeokuta, Ogun State',
        'specs': ['Starch > 26%', 'Harvest on Order', 'Farmgate Direct'],
        'rating': Decimal('4.8'),
    },
    {
        'email': 'northern.sesame@agrojet.africa',
        'first_name': 'Northern', 'last_name': 'Sesame Coop',
        'crop': 'White Raw Sesame Seeds (Humera Grade)',
        'volume_available': Decimal('80'), 'price_per_unit': Decimal('1250000'),
        'location': 'Dawanau, Kano State',
        'specs': ['Purity 99.5%', 'Oil Content 52%', 'Free from Foreign Matter'],
        'rating': Decimal('5.0'),
    },
    {
        'email': 'middlebelt.soy@agrojet.africa',
        'first_name': 'Middle Belt', 'last_name': 'Soy Network',
        'crop': 'Non-GMO Yellow Soybeans',
        'volume_available': Decimal('200'), 'price_per_unit': Decimal('820000'),
        'location': 'Gboko, Benue State',
        'specs': ['Protein > 40%', 'Moisture 10%', 'Cleaned & Sorted'],
        'rating': Decimal('4.7'),
    },
]

INPUTS = [
    {
        'name': 'Premier Hybrid F1 Seed Maize (25kg Bag)',
        'category': AgriInput.InputCategory.SEEDS,
        'merchant': 'Premier Seeds Nigeria Ltd', 'price': Decimal('48000'),
        'location': 'Ibadan, Oyo State', 'rating': Decimal('4.9'), 'stock': '150 Bags',
        'specs': ['Germination Rate > 98%', 'High Yield Potential (7-9 MT/Ha)', 'Drought Tolerant'],
    },
    {
        'name': 'Indorama Granular Urea 46% Nitrogen (50kg)',
        'category': AgriInput.InputCategory.FERTILIZERS,
        'merchant': 'FarmRight Agrochemicals Ltd', 'price': Decimal('38500'),
        'location': 'Kano, Kano State', 'rating': Decimal('4.8'), 'stock': '500 Bags',
        'specs': ['46% Pure Nitrogen Content', 'Quick-dissolving Granules', 'Factory Direct'],
    },
    {
        'name': 'Honda 3-inch Gasoline Water Pump for Irrigation',
        'category': AgriInput.InputCategory.TOOLS,
        'merchant': 'AgriTech Heavy Machinery Depot', 'price': Decimal('185000'),
        'location': 'Ikeja, Lagos State', 'rating': Decimal('4.9'), 'stock': '25 Units',
        'specs': ['GX200 6.5HP Engine', '1,000 Liters/min Flow', 'Suction Head 8 meters'],
    },
    {
        'name': 'Dual Powered Battery/Manual Knapsack Sprayer (20L)',
        'category': AgriInput.InputCategory.TOOLS,
        'merchant': 'GreenField Agro Supplies', 'price': Decimal('62000'),
        'location': 'Akure, Ondo State', 'rating': Decimal('4.7'), 'stock': '80 Units',
        'specs': ['12V 8Ah Rechargeable Battery', '4-5 Hours Continuous Operation', 'Stainless Steel Wand'],
    },
]

POOLS = [
    {
        'title': 'Solar-Powered Continuous Grain & Cassava Dryer (10 Ton/Day)',
        'origin': 'Germany (AgroTech GmbH)',
        'category': 'Post-Harvest Drying',
        'price_usd': Decimal('4200'), 'retail_price_usd': Decimal('6500'),
        'target_units': 5, 'reserved_units': 3, 'estimated_days': 25,
        'description': 'Hybrid solar and biomass multi-crop dryer. Prevents mold, aflatoxins, and crop wastage during harvest season.',
        'specs': ['15kW Integrated Solar Array', 'Automated Humidity & Temp Sensors', 'CE & ISO 9001 Certified'],
        'group_savings': 'Save $2,300 USD per unit via bulk freight & customs',
    },
    {
        'title': 'Precision IoT Drip Irrigation & Fertigation Master Kit (5 Hectares)',
        'origin': 'Israel (Netafim Export)',
        'category': 'Irrigation & Smart Farming',
        'price_usd': Decimal('1800'), 'retail_price_usd': Decimal('2800'),
        'target_units': 10, 'reserved_units': 7, 'estimated_days': 18,
        'description': 'Automated pressure-compensating drip system with solar fertigation pump and smartphone soil moisture telemetry.',
        'specs': ['Self-Cleaning Drippers', 'Venturi Fertilizer Injector', 'App-Controlled Solenoid Valves'],
        'group_savings': 'Save $1,000 USD per unit via group customs clearance',
    },
    {
        'title': 'Compact Multi-Crop Paddy & Soybean Mini Combine Harvester (25 HP)',
        'origin': 'Japan (Yanmar Agri)',
        'category': 'Heavy Harvesting',
        'price_usd': Decimal('8500'), 'retail_price_usd': Decimal('12000'),
        'target_units': 6, 'reserved_units': 5, 'estimated_days': 30,
        'description': 'Crawler-track mini combine harvester specifically engineered for smallholder fields and wet soil conditions.',
        'specs': ['25 HP Water-cooled Diesel Engine', 'Rice, Wheat & Soy Harvesting', 'Rubber Tracks for Soft Terrain'],
        'group_savings': 'Save $3,500 USD per unit in container shipping',
    },
    {
        'title': 'Wireless Spectrometer Soil NPK & pH Diagnostic Probe',
        'origin': 'Netherlands (SensorTech EU)',
        'category': 'Agronomy Tech',
        'price_usd': Decimal('350'), 'retail_price_usd': Decimal('580'),
        'target_units': 20, 'reserved_units': 14, 'estimated_days': 14,
        'description': 'Instant optical soil testing probe providing real-time N-P-K nutrient levels, soil pH, and EC reading directly on mobile app.',
        'specs': ['Bluetooth 5.0 Connectivity', 'Instant 30-Second Analysis', 'Rechargeable Li-Ion Battery'],
        'group_savings': 'Save $230 USD per probe via co-import',
    },
]


class Command(BaseCommand):
    help = 'Seed demo users, catalog and sample escrow data for AGRO JET.'

    def add_arguments(self, parser):
        parser.add_argument('--flush', action='store_true', help='Delete existing marketplace + demo data first')

    @transaction.atomic
    def handle(self, *args, **options):
        if options['flush']:
            self._flush()

        self.stdout.write('Creating users…')
        admin, admin_created = User.objects.get_or_create(
            email='admin@agrojet.africa',
            defaults={
                'first_name': 'Platform', 'last_name': 'Admin',
                'role': User.Role.ADMIN, 'is_staff': True, 'is_superuser': True,
                'bvn_verified': True, 'kyc_tier': 2,
            },
        )
        if admin_created:
            admin.set_password(DEMO_PASSWORD)
            admin.save()

        farmer, farmer_created = User.objects.get_or_create(
            email='farmer@agrojet.africa',
            defaults={
                'first_name': 'Bunch', 'last_name': 'Dillon',
                'phone_number': '+2348030001122', 'role': User.Role.FARMER,
                'bvn': '95888168924', 'bvn_verified': True, 'kyc_tier': 2,
            },
        )
        if farmer_created:
            farmer.set_password(DEMO_PASSWORD)
            farmer.save()

        buyer, buyer_created = User.objects.get_or_create(
            email='buyer@agrojet.africa',
            defaults={
                'first_name': 'Ngozi', 'last_name': 'Offtaker',
                'role': User.Role.BUYER, 'bvn_verified': False, 'kyc_tier': 1,
            },
        )
        if buyer_created:
            buyer.set_password(DEMO_PASSWORD)
            buyer.save()

        if farmer_created:
            from marketplace.services import get_wallet
            wallet = get_wallet(farmer)
            wallet.ngn_balance = Decimal('2500000')
            wallet.cngn_balance = Decimal('150000')
            wallet.usd_balance = Decimal('2500')
            wallet.save()

        self.stdout.write('Creating catalog…')
        for data in BUYERS:
            CorporateBuyer.objects.get_or_create(company_name=data['company_name'], defaults=data)
        for data in INPUTS:
            AgriInput.objects.get_or_create(name=data['name'], defaults=data)
        for data in POOLS:
            ImportPool.objects.get_or_create(title=data['title'], defaults=data)

        self.stdout.write('Creating produce listings…')
        for data in PRODUCE:
            seller, created = User.objects.get_or_create(
                email=data.pop('email'),
                defaults={
                    'first_name': data.pop('first_name'),
                    'last_name': data.pop('last_name'),
                    'role': User.Role.FARMER, 'kyc_tier': 2, 'bvn_verified': True,
                },
            )
            if created:
                seller.set_password(DEMO_PASSWORD)
                seller.save()
            ProduceListing.objects.get_or_create(
                seller=seller, crop=data['crop'],
                defaults={**data, 'seller': seller},
            )

        if not EscrowContract.objects.exists():
            self.stdout.write('Creating sample escrow contract…')
            EscrowContract.objects.create(
                kind=EscrowContract.Kind.HARVEST,
                buyer=buyer,
                buyer_label=buyer.get_full_name(),
                seller_label='Ogun Farmers Cooperative Union',
                item='Cleaned Yellow Maize (Grade A)',
                quantity='20 MT',
                amount=Decimal('9000000'),
                currency='cNGN',
                stage=EscrowContract.Stage.FUNDS_LOCKED,
                quality_specs='Moisture < 12%, Aflatoxin Safe',
            )

        self.stdout.write(self.style.SUCCESS(
            f'\nSeed complete.\n'
            f'  Admin  → admin@agrojet.africa / {DEMO_PASSWORD}\n'
            f'  Farmer → farmer@agrojet.africa / {DEMO_PASSWORD}\n'
            f'  Buyer  → buyer@agrojet.africa / {DEMO_PASSWORD}'
        ))

    def _flush(self):
        from marketplace.models import (
            Payment, PoolParticipation, SupplyProposal, Wallet,
        )
        Payment.objects.all().delete()
        PoolParticipation.objects.all().delete()
        SupplyProposal.objects.all().delete()
        EscrowContract.objects.all().delete()
        ImportPool.objects.all().delete()
        AgriInput.objects.all().delete()
        ProduceListing.objects.all().delete()
        CorporateBuyer.objects.all().delete()
        User.objects.filter(email__endswith='@agrojet.africa').delete()
        Wallet.objects.all().delete()
        self.stdout.write(self.style.WARNING('Existing demo data flushed.'))
