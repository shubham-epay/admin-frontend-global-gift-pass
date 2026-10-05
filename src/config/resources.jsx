import { Link } from 'react-router-dom';
import { money, date, dateTime } from '../utils/format';
import BannerPreview from '../components/BannerPreview';
import CountryVisibilityToggle from '../components/CountryVisibilityToggle';
import { FactChips, FactsSummary, PriceCell } from '../components/ProductFacts';

const countryFlags = (list = []) => (list.length
  ? <span className="flags" title={list.map((c) => c.name).join(', ')}>{list.slice(0, 4).map((c) => <span key={c._id}>{c.flag || c.code || '🏳️'}</span>)}{list.length > 4 && <small className="muted">+{list.length - 4}</small>}</span>
  : <span className="muted">Global</span>);

const PUBLISH = ['ACTIVE', 'INACTIVE'];
const PRODUCT_STATUS = ['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED'];
const USER_STATUS = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
const BANNER_PLACEMENTS = ['HOME_HERO', 'HOME_SECONDARY', 'CATEGORY'];
const BANNER_TEXT_POSITIONS = ['LEFT', 'CENTER', 'RIGHT'];
export const ORDER_STATUS = ['PENDING', 'PAID', 'PROCESSING', 'SENT', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
export const PAYMENT_STATUS = ['PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'];
export const VOUCHER_STATUS = ['ACTIVE', 'REDEEMED', 'EXPIRED', 'EXCHANGED', 'CANCELLED'];

const seo = [
  { name: 'seoTitle', label: 'SEO title', max: 70, help: 'Up to 70 characters' },
  { name: 'seoDescription', label: 'SEO description', type: 'textarea', rows: 2, max: 170, help: 'Up to 170 characters' },
];

/**
 * Column: { key, label, type: text|title|money|status|date|datetime|thumb|bool|count, render(row) }
 * Field:  { name, label, type, required, options, endpoint, labelKey, createOnly, readOnlyOnEdit, default, wide, help }
 */
export const resources = {
  products: {
    key: 'products', title: 'Products', singular: 'Product', path: '/products', endpoint: '/admin/products',
    importPath: '/products/import', importPerm: 'products.create',
    bulk: {
      endpoint: '/admin/products/bulk',
      statuses: [
        { value: 'ACTIVE', label: 'Make active', icon: 'check', primary: true },
        { value: 'DRAFT', label: 'Set to draft' },
        { value: 'INACTIVE', label: 'Set inactive' },
        { value: 'ARCHIVED', label: 'Archive' },
      ],
    },
    perms: { read: 'products.read', create: 'products.create', update: 'products.update', delete: 'products.delete' },
    search: 'Search title, slug, city or supplier ref',
    Summary: FactsSummary,
    columns: [
      { key: 'imageUrls', type: 'thumb' },
      { key: 'title', label: 'Experience', type: 'title', sub: (r) => r.partnerId?.name },
      { key: 'categoryId.name', label: 'Category' },
      { key: 'countries', label: 'Countries', render: (r) => countryFlags(r.countries) },
      { key: 'salePrice', label: 'Price', type: 'money', render: (r) => <PriceCell product={r} /> },
      { key: 'facts', label: 'Delivery · Type · Margin', render: (r) => <FactChips product={r} /> },
      { key: 'status', label: 'Status', type: 'status' },
    ],
    filters: [
      { key: 'status', label: 'Status', options: PRODUCT_STATUS },
      { key: 'featured', label: 'Featured', options: ['true', 'false'], optionLabel: (o) => (o === 'true' ? 'Featured' : 'Not featured') },
      { key: 'country', label: 'Country', endpoint: '/admin/countries', optionText: (c) => `${c.flag || ''} ${c.name}`.trim() },
    ],
    sections: [
      { title: 'Experience', fields: [
        { name: 'title', label: 'Title', required: true, max: 200, wide: true },
        { name: 'slug', label: 'URL slug', type: 'slug', source: 'title', required: true, help: 'Used in the product URL' },
        { name: 'status', label: 'Status', type: 'select', options: PRODUCT_STATUS, required: true, default: 'DRAFT', help: 'Only Active products appear on the website' },
        { name: 'categoryId', label: 'Category', type: 'ref', endpoint: '/admin/categories', labelKey: 'name', required: true },
        { name: 'partnerId', label: 'Partner', type: 'ref', endpoint: '/admin/partners', labelKey: 'name', required: true, refLabel: (p) => `${p.name} · ${p.city}` },
        { name: 'shortDescription', label: 'Short description', type: 'textarea', rows: 2, max: 500, wide: true },
        { name: 'description', label: 'Full description', type: 'textarea', rows: 7, wide: true },
        { name: 'termsConditions', label: 'Terms and conditions', type: 'textarea', rows: 4, wide: true },
      ] },
      { title: 'Price and validity', fields: [
        { name: 'price', label: 'Price', type: 'money', required: true },
        { name: 'salePrice', label: 'Sale price', type: 'money', required: true, help: 'Same as price if not discounted' },
        { name: 'currency', label: 'Currency', uppercase: true, max: 3, default: 'AED', help: '3-letter code, e.g. AED, USD, GBP' },
        { name: 'denominations', label: 'Denominations', type: 'denominations', wide: true, help: '' },
        { name: 'amountMin', label: 'Open amount: minimum', type: 'number', step: '0.01', min: 0, help: 'Only for products where the customer chooses the value (e.g. a 50–5,000 gift card)' },
        { name: 'amountMax', label: 'Open amount: maximum', type: 'number', step: '0.01', min: 0, help: 'Set both or leave both empty' },
        { name: 'duration', label: 'Duration', required: true, placeholder: 'e.g. 90 minutes', max: 60 },
        { name: 'validityDays', label: 'Voucher validity (days)', type: 'number', required: true, default: 365, min: 1 },
        { name: 'peopleCount', label: 'People included', type: 'number', min: 1 },
      ] },
      { title: 'Where it is sold', fields: [
        { name: 'countries', label: 'Countries', type: 'refMulti', endpoint: '/admin/countries', labelKey: 'name', refLabel: (c) => `${c.flag || ''} ${c.name}`.trim(), wide: true,
          help: 'Leave empty to show it in every country. Otherwise it only shows when the visitor picks one of these countries (or Global).' },
        { name: 'city', label: 'City', help: 'Optional, e.g. for experiences' },
        { name: 'country', label: 'Location (country name)', required: true, default: 'United Arab Emirates' },
      ] },
      { title: 'Images', fields: [
        { name: 'imageUrls', label: 'Main images', type: 'urlList', required: true, wide: true, help: 'First image is the cover. At least one.' },
        { name: 'galleryUrls', label: 'Gallery', type: 'urlList', wide: true },
      ] },
      { title: 'Merchandising', fields: [
        { name: 'featured', label: 'Featured', type: 'checkbox', checkLabel: 'Show in featured on the homepage' },
        { name: 'bestSeller', label: 'Best seller', type: 'checkbox', checkLabel: 'Mark as best seller' },
        { name: 'flashSale', label: 'Flash sale', type: 'checkbox', checkLabel: 'Include in flash sale' },
      ] },
      { title: 'Voucher page content', fields: [
        { name: 'whatsIncluded', label: "What's included", type: 'lines', wide: true, help: 'One item per line' },
        { name: 'whatsNotIncluded', label: "What's not included", type: 'lines', rows: 4, wide: true, help: 'One item per line' },
        { name: 'packageDetails', label: 'Package details', type: 'pairs', wide: true, help: 'One per line as "Label: value", e.g. Duration: 3–4 hours' },
        { name: 'howToUse', label: 'How to use', type: 'lines', rows: 6, wide: true, help: 'One step per line, in order' },
        { name: 'importantInstructions', label: 'Important instructions', type: 'lines', rows: 6, wide: true, help: 'One instruction per line' },
        { name: 'legalNote', label: 'Legal note', type: 'textarea', rows: 2, wide: true },
      ] },
      { title: 'Custom fields', fields: [
        { name: 'customFields', label: '', type: 'customFields', wide: true, help: 'Extra details such as delivery type or margin. Public fields show on the product page; internal ones stay here.' },
      ] },
      { title: 'Supplier', fields: [
        { name: 'supplierReference', label: 'Supplier reference', max: 120 },
        { name: 'apiDeliveryId', label: 'API delivery ID', max: 120 },
      ] },
      { title: 'Search engines', fields: seo },
    ],
  },

  categories: {
    key: 'categories', title: 'Categories', singular: 'Category', path: '/categories', endpoint: '/admin/categories',
    perms: { read: 'categories.manage', create: 'categories.manage', update: 'categories.manage', delete: 'categories.manage' },
    search: 'Search name or slug',
    columns: [
      { key: 'iconUrl', type: 'thumb' },
      { key: 'name', label: 'Name', type: 'title', sub: (r) => r.slug },
      { key: 'parentCategoryId.name', label: 'Parent' },
      { key: 'sortOrder', label: 'Order' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
    filters: [{ key: 'status', label: 'Status', options: PUBLISH }],
    sections: [
      { title: 'Category', fields: [
        { name: 'name', label: 'Name', required: true },
        { name: 'slug', label: 'URL slug', type: 'slug', source: 'name', required: true },
        { name: 'status', label: 'Status', type: 'select', options: PUBLISH, required: true, default: 'ACTIVE' },
        { name: 'parentCategoryId', label: 'Parent category', type: 'ref', endpoint: '/admin/categories', labelKey: 'name' },
        { name: 'sortOrder', label: 'Sort order', type: 'number', default: 0 },
        { name: 'description', label: 'Description', type: 'textarea', rows: 3, wide: true },
        { name: 'iconUrl', label: 'Icon URL', type: 'url' },
        { name: 'bannerUrl', label: 'Banner URL', type: 'url' },
      ] },
      { title: 'Search engines', fields: seo },
    ],
  },

  countries: {
    key: 'countries', title: 'Countries', singular: 'Country', path: '/countries', endpoint: '/admin/countries',
    perms: { read: 'countries.manage', create: 'countries.manage', update: 'countries.manage', delete: 'countries.manage' },
    search: 'Search name, code or currency',
    createLabel: 'Add country',
    columns: [
      { key: 'name', label: 'Country', render: (r) => <span className="country-cell"><span className="country-flag" aria-hidden>{r.flag || '🏳️'}</span><span className="cell-title"><strong>{r.name}</strong><small>{[r.code, r.currency].filter(Boolean).join(' · ')}</small></span></span> },
      { key: 'productCount', label: 'Products', render: (r) => (r.productCount
        ? <span className="cell-title"><Link to={`/products?country=${r._id}`} onClick={(e) => e.stopPropagation()}>{r.productCount} product{r.productCount === 1 ? '' : 's'}</Link>
          <small className={r.liveCount ? '' : 'warn-text'}>{r.liveCount ? `${r.liveCount} live on the website` : 'None active yet'}{r.liveCount < r.productCount && <> · <Link to={`/products?country=${r._id}&status=DRAFT`} onClick={(e) => e.stopPropagation()}>{r.productCount - r.liveCount} not active</Link></>}</small></span>
        : <span className="muted">0</span>) },
      { key: 'sortOrder', label: 'Order' },
      { key: 'status', label: 'Show on website', render: (r) => <CountryVisibilityToggle key={`${r._id}-${r.status}`} country={r} /> },
    ],
    filters: [{ key: 'status', label: 'Visibility', options: PUBLISH, optionLabel: (o) => (o === 'ACTIVE' ? 'Shown' : 'Hidden') }],
    sections: [
      { title: 'Country', fields: [
        { name: 'name', label: 'Name', type: 'suggest', required: true, max: 80, placeholder: 'Start typing, e.g. United Arab Emirates', suggestEndpoint: '/admin/countries/iso', suggestLabel: (c) => c.name,
          help: 'Pick from the list and the ISO code, flag and currency are filled in for you' },
        { name: 'code', label: 'ISO code', uppercase: true, max: 2, placeholder: 'AE', help: '2 letters. Optional when the name is recognised.' },
        { name: 'currency', label: 'Currency', uppercase: true, max: 3, placeholder: 'AED' },
        { name: 'status', label: 'Show on website', type: 'segmented', options: PUBLISH, optionLabel: (o) => (o === 'ACTIVE' ? 'Shown' : 'Hidden'), default: 'ACTIVE', required: true,
          help: 'Hidden countries are removed from the website country picker, together with products sold only there' },
        { name: 'sortOrder', label: 'Sort order', type: 'number', default: 0, help: 'Lower numbers show first in the picker' },
      ] },
    ],
  },

  partners: {
    key: 'partners', title: 'Partners', singular: 'Partner', path: '/partners', endpoint: '/admin/partners',
    perms: { read: 'partners.manage', create: 'partners.manage', update: 'partners.manage', delete: 'partners.manage' },
    search: 'Search name, city or email',
    columns: [
      { key: 'logoUrl', type: 'thumb' },
      { key: 'name', label: 'Partner', type: 'title', sub: (r) => r.email },
      { key: 'city', label: 'City', render: (r) => `${r.city}, ${r.country}` },
      { key: 'phone', label: 'Phone' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
    filters: [{ key: 'status', label: 'Status', options: PUBLISH }],
    sections: [
      { title: 'Partner', fields: [
        { name: 'name', label: 'Name', required: true },
        { name: 'status', label: 'Status', type: 'select', options: PUBLISH, required: true, default: 'ACTIVE' },
        { name: 'address', label: 'Address', required: true, wide: true },
        { name: 'city', label: 'City', required: true },
        { name: 'country', label: 'Country', required: true, default: 'United Arab Emirates' },
        { name: 'website', label: 'Website', type: 'url' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Phone', placeholder: '+971 …' },
        { name: 'workingHours', label: 'Working hours', type: 'textarea', rows: 2, placeholder: 'Sun–Thu 10:00–22:00' },
        { name: 'description', label: 'Description', type: 'textarea', rows: 4, wide: true },
      ] },
      { title: 'Images', fields: [
        { name: 'logoUrl', label: 'Logo URL', type: 'url' },
        { name: 'coverImageUrl', label: 'Cover image URL', type: 'url' },
        { name: 'galleryUrls', label: 'Gallery', type: 'urlList', wide: true },
      ] },
    ],
  },

  giftBoxes: {
    key: 'giftBoxes', title: 'Gift boxes', singular: 'Gift box', path: '/gift-boxes', endpoint: '/admin/gift-boxes',
    perms: { read: 'giftBoxes.manage', create: 'giftBoxes.manage', update: 'giftBoxes.manage', delete: 'giftBoxes.manage' },
    search: 'Search name',
    columns: [
      { key: 'coverImageUrl', type: 'thumb' },
      { key: 'name', label: 'Gift box', type: 'title' },
      { key: 'productIds', label: 'Experiences', render: (r) => r.productIds?.length ?? 0 },
      { key: 'salePrice', label: 'Price', render: (r) => money(r.salePrice ?? r.price) },
      { key: 'validityDays', label: 'Validity', render: (r) => `${r.validityDays} days` },
      { key: 'status', label: 'Status', type: 'status' },
    ],
    filters: [{ key: 'status', label: 'Status', options: PUBLISH }],
    sections: [
      { title: 'Gift box', fields: [
        { name: 'name', label: 'Name', required: true },
        { name: 'status', label: 'Status', type: 'select', options: PUBLISH, required: true, default: 'ACTIVE' },
        { name: 'price', label: 'Price', type: 'money', required: true },
        { name: 'salePrice', label: 'Sale price', type: 'money' },
        { name: 'validityDays', label: 'Validity (days)', type: 'number', required: true, default: 365, min: 1 },
        { name: 'coverImageUrl', label: 'Cover image URL', type: 'url', required: true },
        { name: 'productIds', label: 'Experiences in this box', type: 'refMulti', endpoint: '/admin/products', labelKey: 'title', required: true, wide: true, help: 'The recipient chooses one of these' },
        { name: 'description', label: 'Description', type: 'textarea', rows: 4, wide: true },
      ] },
    ],
  },

  coupons: {
    key: 'coupons', title: 'Coupons', singular: 'Coupon', path: '/coupons', endpoint: '/admin/coupons',
    perms: { read: ['coupons.read', 'coupons.create', 'coupons.update'], create: 'coupons.create', update: 'coupons.update', delete: 'coupons.delete' },
    search: 'Search code or title',
    columns: [
      { key: 'code', label: 'Code', type: 'title', sub: (r) => r.title, mono: true },
      { key: 'discountValue', label: 'Discount', render: (r) => (r.discountType === 'PERCENTAGE' ? `${r.discountValue}%${r.maximumDiscount ? ` up to ${money(r.maximumDiscount)}` : ''}` : money(r.discountValue)) },
      { key: 'validTill', label: 'Valid', render: (r) => `${date(r.validFrom)} – ${date(r.validTill)}` },
      { key: 'usedCount', label: 'Used', render: (r) => `${r.usedCount}${r.usageLimit ? ` / ${r.usageLimit}` : ''}` },
      { key: 'status', label: 'Status', type: 'status' },
    ],
    filters: [{ key: 'status', label: 'Status', options: PUBLISH }, { key: 'discountType', label: 'Type', options: ['PERCENTAGE', 'FIXED'] }],
    sections: [
      { title: 'Coupon', fields: [
        { name: 'code', label: 'Code', required: true, uppercase: true, placeholder: 'WELCOME25', max: 40 },
        { name: 'title', label: 'Internal title', required: true },
        { name: 'status', label: 'Status', type: 'select', options: PUBLISH, required: true, default: 'ACTIVE' },
        { name: 'description', label: 'Description', type: 'textarea', rows: 2, wide: true },
      ] },
      { title: 'Discount', fields: [
        { name: 'discountType', label: 'Type', type: 'select', options: ['PERCENTAGE', 'FIXED'], required: true, default: 'PERCENTAGE' },
        { name: 'discountValue', label: 'Value', type: 'number', step: '0.01', required: true, help: 'Percent for percentage coupons, AED for fixed' },
        { name: 'minimumOrderValue', label: 'Minimum order value', type: 'money' },
        { name: 'maximumDiscount', label: 'Maximum discount', type: 'money' },
      ] },
      { title: 'Validity and limits', fields: [
        { name: 'validFrom', label: 'Valid from', type: 'date', required: true, help: 'Starts 00:00 UAE time' },
        { name: 'validTill', label: 'Valid till', type: 'dateEnd', required: true, help: 'Ends 23:59 UAE time' },
        { name: 'usageLimit', label: 'Total usage limit', type: 'number', min: 1 },
        { name: 'usagePerUser', label: 'Uses per customer', type: 'number', min: 1, default: 1 },
      ] },
      { title: 'Applies to', fields: [
        { name: 'applicableCategories', label: 'Categories', type: 'refMulti', endpoint: '/admin/categories', labelKey: 'name', wide: true, help: 'Leave empty for all categories' },
        { name: 'applicableProducts', label: 'Products', type: 'refMulti', endpoint: '/admin/products', labelKey: 'title', wide: true, help: 'Leave empty for all products' },
        { name: 'applicableCities', label: 'Cities', type: 'tags', wide: true, placeholder: 'Dubai', help: 'Leave empty for all cities' },
      ] },
    ],
  },

  orders: {
    key: 'orders', title: 'Orders', singular: 'Order', path: '/orders', endpoint: '/admin/orders',
    perms: { read: 'orders.read' }, customDetail: true,
    search: 'Search order number, customer or coupon',
    columns: [
      { key: 'orderNumber', label: 'Order', type: 'title', mono: true, sub: (r) => dateTime(r.createdAt) },
      { key: 'customer.name', label: 'Customer', render: (r) => <span>{r.customer?.name}<small className="block muted">{r.customer?.email}</small></span> },
      { key: 'total', label: 'Total', type: 'money' },
      { key: 'paymentStatus', label: 'Payment', type: 'status' },
      { key: 'orderStatus', label: 'Status', type: 'status' },
    ],
    filters: [{ key: 'orderStatus', label: 'Status', options: ORDER_STATUS }, { key: 'paymentStatus', label: 'Payment', options: PAYMENT_STATUS }],
  },

  vouchers: {
    key: 'vouchers', title: 'Vouchers', singular: 'Voucher', path: '/vouchers', endpoint: '/admin/vouchers',
    perms: { read: 'vouchers.read', create: 'vouchers.create', update: 'vouchers.update' }, customDetail: true,
    search: 'Search code, recipient or sender',
    createLabel: 'Issue voucher',
    columns: [
      { key: 'code', label: 'Code', type: 'title', mono: true, sub: (r) => r.productId?.title || r.giftBoxId?.name },
      { key: 'recipientName', label: 'Recipient', render: (r) => <span>{r.recipientName}<small className="block muted">{r.recipientEmail}</small></span> },
      { key: 'orderId.orderNumber', label: 'Order' },
      { key: 'value', label: 'Value', type: 'money' },
      { key: 'expiryDate', label: 'Expires', type: 'date' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
    filters: [{ key: 'status', label: 'Status', options: VOUCHER_STATUS }, { key: 'expiringInDays', label: 'Expiring', options: ['7', '30'], optionLabel: (o) => `Within ${o} days` }],
    sections: [
      { title: 'Order', fields: [
        { name: 'orderId', label: 'Order', type: 'ref', endpoint: '/admin/orders', required: true, wide: true,
          refLabel: (o) => `${o.orderNumber} · ${o.customer?.email || ''} · ${o.orderStatus}`, help: 'Only paid orders can receive vouchers' },
        { name: 'giftBoxId', label: 'Gift box', type: 'ref', endpoint: '/admin/gift-boxes', labelKey: 'name' },
        { name: 'productId', label: 'Experience', type: 'ref', endpoint: '/admin/products', labelKey: 'title' },
        { name: 'value', label: 'Value', type: 'money', help: 'Defaults to the gift box price' },
        { name: 'expiryDate', label: 'Expiry date', type: 'dateEnd', required: true },
      ] },
      { title: 'Recipient', fields: [
        { name: 'recipientName', label: 'Recipient name', required: true },
        { name: 'recipientEmail', label: 'Recipient email', type: 'email', required: true },
        { name: 'recipientPhone', label: 'Recipient phone' },
        { name: 'senderName', label: 'From (sender name)', required: true },
        { name: 'message', label: 'Gift message', type: 'textarea', rows: 3, max: 1000, wide: true },
      ] },
    ],
    createEndpoint: '/admin/vouchers/create',
  },

  banners: {
    key: 'banners', title: 'Banners', singular: 'Banner', path: '/banners', endpoint: '/admin/banners',
    perms: { read: 'cms.manage', create: 'cms.manage', update: 'cms.manage', delete: 'cms.manage' },
    search: 'Search heading or text',
    Preview: BannerPreview,
    columns: [
      { key: 'imageUrl', type: 'thumb', wide: true },
      { key: 'title', label: 'Heading', type: 'title', sub: (r) => r.subtitle },
      { key: 'buttonText', label: 'Button', render: (r) => (r.buttonText ? <span className="btn-chip" style={{ background: r.buttonColor || '#E0435A' }}>{r.buttonText}</span> : <span className="muted">—</span>) },
      { key: 'placement', label: 'Placement', type: 'humanize' },
      { key: 'startDate', label: 'Schedule', render: (r) => (r.startDate || r.endDate ? `${date(r.startDate)} – ${date(r.endDate)}` : 'Always') },
      { key: 'status', label: 'Status', type: 'status' },
    ],
    filters: [{ key: 'status', label: 'Status', options: PUBLISH }, { key: 'placement', label: 'Placement', options: BANNER_PLACEMENTS }],
    sections: [
      { title: 'Text on the banner', fields: [
        { name: 'title', label: 'Heading', required: true, max: 160, wide: true, placeholder: 'Make Every Celebration Special' },
        { name: 'subtitle', label: 'Text', type: 'textarea', rows: 2, max: 300, wide: true, placeholder: 'Celebrate their big moments with thoughtful gifts, unforgettable experiences, and memories made together.' },
        { name: 'buttonText', label: 'Button text', max: 40, placeholder: 'Find the Perfect Gift', help: 'Leave empty for no button' },
        { name: 'buttonLink', label: 'Button link', placeholder: '/categories/dining', help: 'A site path starting with / or a full https:// URL' },
        { name: 'openInNewTab', label: 'Open in new tab', type: 'checkbox', checkLabel: 'Open the button link in a new tab' },
      ] },
      { title: 'Images', fields: [
        { name: 'imageUrl', label: 'Desktop image URL', type: 'url', required: true, wide: true, help: 'About 1950 × 800 px (2.4 : 1)' },
        { name: 'mobileImageUrl', label: 'Mobile image URL', type: 'url', wide: true, help: 'Optional. Portrait or square works best; the desktop image is used if empty.' },
        { name: 'imageAlt', label: 'Image description (alt text)', max: 160, wide: true, help: 'Describes the image for screen readers and search engines' },
      ] },
      { title: 'Appearance', fields: [
        { name: 'textPosition', label: 'Text position', type: 'segmented', options: BANNER_TEXT_POSITIONS, default: 'LEFT', required: true },
        { name: 'textTheme', label: 'Text colour', type: 'segmented', options: ['DARK', 'LIGHT'], optionLabel: (o) => (o === 'DARK' ? 'Dark text' : 'Light text'), default: 'DARK', required: true, help: 'Dark text for light images, light text for dark images' },
        { name: 'buttonColor', label: 'Button colour', type: 'color', default: '#E0435A', swatches: ['#E0435A', '#EE0529', '#01124F', '#FDB51C', '#1B3A9C'], wide: true },
      ] },
      { title: 'Placement and schedule', fields: [
        { name: 'status', label: 'Status', type: 'select', options: PUBLISH, required: true, default: 'ACTIVE' },
        { name: 'placement', label: 'Placement', type: 'select', options: BANNER_PLACEMENTS, required: true, default: 'HOME_HERO' },
        { name: 'startDate', label: 'Show from', type: 'datetime', help: 'UAE time' },
        { name: 'endDate', label: 'Show until', type: 'datetime', help: 'UAE time' },
        { name: 'sortOrder', label: 'Sort order', type: 'number', default: 0, help: 'Lower numbers show first' },
      ] },
    ],
  },

  collections: {
    key: 'collections', title: 'Collections', singular: 'Collection', path: '/collections', endpoint: '/admin/collections',
    perms: { read: 'cms.manage', create: 'cms.manage', update: 'cms.manage', delete: 'cms.manage' },
    search: 'Search title',
    columns: [
      { key: 'imageUrl', type: 'thumb' },
      { key: 'title', label: 'Collection', type: 'title', sub: (r) => r.slug },
      { key: 'productIds', label: 'Experiences', render: (r) => r.productIds?.length ?? 0 },
      { key: 'showOnHome', label: 'On homepage', type: 'bool' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
    filters: [{ key: 'status', label: 'Status', options: PUBLISH }],
    sections: [
      { title: 'Collection', fields: [
        { name: 'title', label: 'Title', required: true },
        { name: 'slug', label: 'URL slug', type: 'slug', source: 'title', required: true },
        { name: 'status', label: 'Status', type: 'select', options: PUBLISH, required: true, default: 'ACTIVE' },
        { name: 'sortOrder', label: 'Sort order', type: 'number', default: 0 },
        { name: 'showOnHome', label: 'Homepage', type: 'checkbox', checkLabel: 'Show on the homepage' },
        { name: 'imageUrl', label: 'Image URL', type: 'url' },
        { name: 'description', label: 'Description', type: 'textarea', rows: 3, wide: true },
        { name: 'productIds', label: 'Experiences', type: 'refMulti', endpoint: '/admin/products', labelKey: 'title', wide: true },
      ] },
    ],
  },

  blogs: {
    key: 'blogs', title: 'Blog', singular: 'Blog post', path: '/blogs', endpoint: '/admin/blogs',
    perms: { read: 'cms.manage', create: 'cms.manage', update: 'cms.manage', delete: 'cms.manage' },
    search: 'Search title or author',
    columns: [
      { key: 'coverImageUrl', type: 'thumb' },
      { key: 'title', label: 'Post', type: 'title', sub: (r) => r.authorName },
      { key: 'publishedAt', label: 'Published', type: 'date' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
    filters: [{ key: 'status', label: 'Status', options: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] }],
    sections: [
      { title: 'Post', fields: [
        { name: 'title', label: 'Title', required: true, wide: true },
        { name: 'slug', label: 'URL slug', type: 'slug', source: 'title', required: true },
        { name: 'status', label: 'Status', type: 'select', options: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], required: true, default: 'DRAFT' },
        { name: 'authorName', label: 'Author' },
        { name: 'coverImageUrl', label: 'Cover image URL', type: 'url' },
        { name: 'excerpt', label: 'Excerpt', type: 'textarea', rows: 2, max: 500, wide: true },
        { name: 'content', label: 'Content', type: 'textarea', rows: 16, required: true, wide: true, help: 'Markdown or HTML, rendered and sanitised by the storefront' },
        { name: 'tags', label: 'Tags', type: 'tags', wide: true },
      ] },
      { title: 'Search engines', fields: seo },
    ],
  },

  faqs: {
    key: 'faqs', title: 'FAQs', singular: 'FAQ', path: '/faqs', endpoint: '/admin/faqs',
    perms: { read: 'cms.manage', create: 'cms.manage', update: 'cms.manage', delete: 'cms.manage' },
    search: 'Search questions and answers',
    columns: [
      { key: 'question', label: 'Question', type: 'title' },
      { key: 'group', label: 'Group' },
      { key: 'sortOrder', label: 'Order' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
    filters: [{ key: 'status', label: 'Status', options: PUBLISH }],
    sections: [
      { title: 'FAQ', fields: [
        { name: 'question', label: 'Question', required: true, wide: true },
        { name: 'answer', label: 'Answer', type: 'textarea', rows: 6, required: true, wide: true },
        { name: 'group', label: 'Group', default: 'General' },
        { name: 'sortOrder', label: 'Sort order', type: 'number', default: 0 },
        { name: 'status', label: 'Status', type: 'select', options: PUBLISH, required: true, default: 'ACTIVE' },
      ] },
    ],
  },

  users: {
    key: 'users', title: 'Admin users', singular: 'Admin user', path: '/users', endpoint: '/admin/users',
    perms: { read: 'users.manage', create: 'users.manage', update: 'users.manage', delete: 'users.manage' },
    fixedQuery: { type: 'ADMIN' },
    search: 'Search name or email',
    columns: [
      { key: 'name', label: 'Name', type: 'title', sub: (r) => r.email },
      { key: 'roleId.name', label: 'Role' },
      { key: 'lastLoginAt', label: 'Last sign-in', type: 'datetime' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
    filters: [{ key: 'status', label: 'Status', options: USER_STATUS }],
    sections: [
      { title: 'Account', fields: [
        { name: 'name', label: 'Full name', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true, readOnlyOnEdit: true },
        { name: 'phone', label: 'Phone' },
        { name: 'roleId', label: 'Role', type: 'ref', endpoint: '/admin/roles', labelKey: 'name', required: true },
        { name: 'status', label: 'Status', type: 'select', options: USER_STATUS, required: true, default: 'ACTIVE' },
        { name: 'password', label: 'Temporary password', type: 'password', required: true, createOnly: true,
          help: 'At least 8 characters with upper and lower case, a number and a symbol. Share it securely.' },
      ] },
    ],
    extra: 'userSecurity',
  },

  customers: {
    key: 'customers', title: 'Customers', singular: 'Customer', path: '/customers', endpoint: '/admin/users',
    perms: { read: 'users.manage', update: 'users.manage', delete: 'users.manage' },
    fixedQuery: { type: 'CUSTOMER' },
    search: 'Search name, email or phone',
    columns: [
      { key: 'name', label: 'Name', type: 'title', sub: (r) => r.email },
      { key: 'phone', label: 'Phone' },
      { key: 'createdAt', label: 'Joined', type: 'date' },
      { key: 'status', label: 'Status', type: 'status' },
    ],
    filters: [{ key: 'status', label: 'Status', options: USER_STATUS }],
    sections: [
      { title: 'Customer', fields: [
        { name: 'name', label: 'Full name', required: true },
        { name: 'email', label: 'Email', type: 'email', readOnlyOnEdit: true },
        { name: 'phone', label: 'Phone' },
        { name: 'status', label: 'Status', type: 'select', options: USER_STATUS, required: true, help: 'Suspended customers cannot sign in or order' },
      ] },
    ],
  },

  roles: {
    key: 'roles', title: 'Roles', singular: 'Role', path: '/roles', endpoint: '/admin/roles',
    perms: { read: 'roles.manage', create: 'roles.manage', update: 'roles.manage', delete: 'roles.manage' },
    search: 'Search roles',
    columns: [
      { key: 'name', label: 'Role', type: 'title', sub: (r) => r.description },
      { key: 'permissions', label: 'Permissions', render: (r) => (r.permissions.includes('*') ? 'Full access' : r.permissions.length) },
      { key: 'userCount', label: 'Users' },
      { key: 'isSystem', label: 'System role', type: 'bool' },
    ],
    readOnlyWhen: (doc) => doc?.isSystem,
    readOnlyNote: 'This is a system role. It always has full access and cannot be changed or deleted.',
    sections: [
      { title: 'Role', fields: [
        { name: 'name', label: 'Name', required: true },
        { name: 'description', label: 'Description' },
      ] },
      { title: 'Permissions', fields: [
        { name: 'permissions', label: 'What this role can do', type: 'permissions', wide: true, default: [] },
      ] },
    ],
  },

  auditLogs: {
    key: 'auditLogs', title: 'Audit log', singular: 'Entry', path: '/audit-logs', endpoint: '/admin/audit-logs',
    perms: { read: 'auditLogs.read' }, noDetail: true,
    search: 'Search summary, email or action',
    columns: [
      { key: 'createdAt', label: 'When', type: 'datetime' },
      { key: 'actorEmail', label: 'Who' },
      { key: 'action', label: 'Action', mono: true },
      { key: 'summary', label: 'Summary' },
      { key: 'ip', label: 'IP', mono: true },
    ],
    filters: [{ key: 'resource', label: 'Area', options: ['auth', 'products', 'categories', 'partners', 'giftBoxes', 'coupons', 'orders', 'vouchers', 'users', 'roles', 'banners', 'collections', 'blogs', 'faqs'] }],
  },
};

export const NAV = [
  { label: 'Overview', items: [{ to: '/dashboard', label: 'Dashboard', perm: 'dashboard.read', icon: 'dashboard' }] },
  { label: 'Sales', items: [
    { to: '/orders', label: 'Orders', perm: 'orders.read', icon: 'orders' },
    { to: '/vouchers', label: 'Vouchers', perm: 'vouchers.read', icon: 'ticket' },
    { to: '/coupons', label: 'Coupons', perm: resources.coupons.perms.read, icon: 'percent' },
  ] },
  { label: 'Catalogue', items: [
    { to: '/products', label: 'Products', perm: 'products.read', icon: 'box' },
    { to: '/categories', label: 'Categories', perm: 'categories.manage', icon: 'tag' },
    { to: '/countries', label: 'Countries', perm: 'countries.manage', icon: 'globe' },
    { to: '/partners', label: 'Partners', perm: 'partners.manage', icon: 'store' },
    { to: '/gift-boxes', label: 'Gift boxes', perm: 'giftBoxes.manage', icon: 'gift' },
  ] },
  { label: 'Content', items: [
    { to: '/banners', label: 'Banners', perm: 'cms.manage', icon: 'image' },
    { to: '/collections', label: 'Collections', perm: 'cms.manage', icon: 'layers' },
    { to: '/blogs', label: 'Blog', perm: 'cms.manage', icon: 'file' },
    { to: '/faqs', label: 'FAQs', perm: 'cms.manage', icon: 'help' },
  ] },
  { label: 'Administration', items: [
    { to: '/users', label: 'Admin users', perm: 'users.manage', icon: 'shield' },
    { to: '/customers', label: 'Customers', perm: 'users.manage', icon: 'users' },
    { to: '/roles', label: 'Roles', perm: 'roles.manage', icon: 'key' },
    { to: '/audit-logs', label: 'Audit log', perm: 'auditLogs.read', icon: 'list' },
  ] },
];
