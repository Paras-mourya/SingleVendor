# 🎯 Database Optimization Guide - Expert Level
## Kaunsa Factor Kahan Use Karein - Complete Practical Guide

---

# 1️⃣ DATABASE INDEXES - Kahan Aur Kaise Lagayein

## **Kahan Lagayein:**

### ✅ MUST ADD (Har Model Mein):

#### A. Unique Fields (Always Index)
```javascript
// user.model.js
const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  phone: { type: String },
  username: { type: String }
});

// ✅ Unique fields pe INDEX LAGAO
userSchema.index({ email: 1 }, { unique: true });  // Login ke liye
userSchema.index({ phone: 1 }, { unique: true, sparse: true });  // Optional unique
userSchema.index({ username: 1 }, { unique: true });  // Profile lookup
```
**Kyun:** Login, signup, duplicate check fast hoga

---

#### B. Foreign Keys (Reference Fields) - Always Index
```javascript
// order.model.js
const orderSchema = new mongoose.Schema({
  customer: { type: Schema.Types.ObjectId, ref: 'Customer' },  // Foreign key
  products: [{ product: { type: Schema.Types.ObjectId, ref: 'Product' } }],
  status: String,
  createdAt: Date
});

// ✅ ALL foreign keys pe INDEX
orderSchema.index({ customer: 1 });  // "Mere orders" query
orderSchema.index({ 'products.product': 1 });  // "Product ke orders"
orderSchema.index({ customer: 1, status: 1 });  // "Mere active orders"
orderSchema.index({ customer: 1, createdAt: -1 });  // "Mere recent orders"
```
**Kyun:** Population, lookup, filtering fast hoga

---

#### C. Frequently Queried Fields
```javascript
// product.model.js
const productSchema = new mongoose.Schema({
  name: String,
  category: { type: Schema.Types.ObjectId, ref: 'Category' },
  status: { type: String, enum: ['active', 'inactive', 'draft'] },
  price: Number,
  isFeatured: Boolean,
  stock: Number,
  createdAt: Date
});

// ✅ Jahan baar baar filter/search karte ho
productSchema.index({ category: 1, status: 1 });  // Category page
productSchema.index({ status: 1, createdAt: -1 });  // Admin list
productSchema.index({ isFeatured: 1 });  // Homepage featured products
productSchema.index({ price: 1 });  // Price filter/sort
```

---

#### D. Text Search Fields
```javascript
// ✅ Search functionality ke liye
productSchema.index({ 
  name: 'text', 
  description: 'text',
  tags: 'text' 
}, { 
  weights: { 
    name: 10,        // Name mein match = zyada score
    description: 5,  
    tags: 3 
  }
});

// Usage
const products = await Product.find({ 
  $text: { $search: 'iphone 15' } 
});
```

---

#### E. Compound Indexes (Multi-field queries)
```javascript
// ✅ Jahan multiple fields filter mein aate hain
productSchema.index({ 
  category: 1,      // Pehle category filter
  status: 1,        // Phir status
  price: 1,         // Phir price sort
  createdAt: -1     // Phir date
});

// Query pattern match karega:
// Product.find({ category: 'electronics', status: 'active' })
//         .sort({ price: 1 })
```

---

#### F. TTL Indexes (Auto-delete data)
```javascript
// otp.model.js
const otpSchema = new mongoose.Schema({
  email: String,
  code: String,
  createdAt: { type: Date, default: Date.now }
});

// ✅ Auto-delete after 10 minutes
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 600 });

// cart.model.js (Guest carts auto-delete)
cartSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 }); // 7 days
```

---

## **Kahan Mat Lagayein:**

```javascript
// ❌ Mat Lagao:

// 1. Boolean fields alone (cardinality kam)
productSchema.index({ isActive: 1 });  // Waste - 50% true, 50% false

// 2. Fields with very unique values (already indexed _id jaisa)
productSchema.index({ _id: 1 });  // Already hai by default!

// 3. Arrays pe single index (compound use karo)
productSchema.index({ tags: 1 });  // Multikey index slow

// 4. Write-heavy fields pe (updates slow honge)
productSchema.index({ viewCount: 1 });  // Har view pe index update - SLOW!
```

---

## **Index Strategy Summary:**

```javascript
// user.model.js - Complete Example
const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  phone: String,
  role: { type: String, enum: ['user', 'admin'] },
  status: { type: String, enum: ['active', 'inactive'] },
  createdAt: Date,
  lastLogin: Date
});

// 1. Unique (MUST)
userSchema.index({ email: 1 }, { unique: true });

// 2. Common Queries
userSchema.index({ role: 1, status: 1 });  // Admin panel filter
userSchema.index({ status: 1, createdAt: -1 });  // User list

// 3. Time-based queries
userSchema.index({ lastLogin: 1 });  // "Inactive users" report

// 4. Compound for admin dashboard
userSchema.index({ role: 1, status: 1, createdAt: -1 });
```

---

# 2️⃣ .lean() - Kahan Use Karein

## **Kahan LAGAO (Always):**

### ✅ READ Operations (100% cases)
```javascript
// ✅ FIND operations - ALWAYS use lean()
const users = await User.find({ status: 'active' }).lean();  // Plain JS objects
const user = await User.findById(id).lean();
const user = await User.findOne({ email }).lean();

// ✅ Aggregation already lean hai (no Mongoose docs)
const stats = await User.aggregate([...]);  // Already plain objects
```

---

## **Kahan MAT LAGAO:**

### ❌ Write Operations
```javascript
// ❌ CREATE - lean() nahi
const user = await User.create({ email: 'test@test.com' });  // Mongoose doc chahiye

// ❌ UPDATE with save() - lean() nahi
const user = await User.findById(id);  // No lean
user.name = 'New Name';
await user.save();  // Mongoose doc save() chahiye

// ❌ DELETE with doc method
const user = await User.findById(id);  // No lean
await user.remove();  // Doc method chahiye
```

---

### ❌ Virtuals/Middleware Chahiye Ho
```javascript
// ❌ Agar virtual populate chahiye
const user = await User.findById(id);  // No lean
console.log(user.fullName);  // Virtual field access

// ❌ Agar pre/post hooks chahiye
const user = await User.findById(id);  // No lean - hooks run honge
```

---

## **Real Usage Pattern:**

```javascript
// ❌ Service Layer - Before (Slow)
class UserService {
  async getUser(id) {
    const user = await User.findById(id);  // Mongoose doc - SLOW
    return user;
  }
}

// ✅ Service Layer - After (Fast)
class UserService {
  async getUser(id) {
    const user = await User.findById(id).lean();  // Plain object - FAST
    return user;
  }
}
```

---

## **Repository Pattern (Best Practice):**

```javascript
// Base Repository - lean() default
class BaseRepository {
  async findById(id) {
    return await this.model.findById(id).lean();  // Always lean
  }
  
  async findOne(filter) {
    return await this.model.findOne(filter).lean();
  }
  
  async find(filter, sort, limit) {
    return await this.model.find(filter)
      .sort(sort)
      .limit(limit)
      .lean();
  }
  
  // Write operations - NO lean
  async create(data) {
    return await this.model.create(data);  // No lean
  }
  
  async update(id, data) {
    return await this.model.findByIdAndUpdate(id, data, { new: true }).lean();
    // new: true pe lean() chal sakta hai
  }
}
```

---

# 3️⃣ .select() & populate() - Selective Field Loading

## **Kahan Use Karein:**

### ✅ Public APIs (Always)
```javascript
// ❌ BAD - Sensitivity leak
const user = await User.findById(id).lean();
// Returns: { _id, email, password, resetToken, __v, ... }

// ✅ GOOD - Only needed fields
const user = await User.findById(id)
  .select('name email avatar createdAt')  // Sirf ye fields
  .lean();
// Returns: { name, email, avatar, createdAt }
```

---

### ✅ List Views (Always)
```javascript
// ❌ BAD - Heavy list
const users = await User.find({}).lean();  // All fields, all users = SLOW

// ✅ GOOD - Minimal fields
const users = await User.find({})
  .select('name email role createdAt')  // Sirf display ke liye
  .limit(20)
  .lean();
```

---

### ✅ Populate with Select (Critical)
```javascript
// ❌ BAD - Full populate
const order = await Order.findById(id)
  .populate('customer')     // Customer ka pura data
  .populate('products')     // Products ka pura data
  .lean();
// Returns: Order + FULL Customer (500KB) + FULL Products (2MB)

// ✅ GOOD - Selective populate
const order = await Order.findById(id)
  .populate('customer', 'name email phone')     // Sirf 3 fields
  .populate('products.product', 'name price thumbnail')  // Sirf 3 fields
  .lean();
// Returns: Order + Customer (2KB) + Products (10KB)
```

---

## **Field Selection Strategy:**

```javascript
// User Profile API
const user = await User.findById(id)
  .select('-password -resetToken -verificationCode -__v')  // Exclude sensitive
  .populate('orders', 'total status createdAt')  // Limited order info
  .lean();

// Admin User List
const users = await User.find({})
  .select('name email role status lastLogin createdAt')  // Only admin needs
  .limit(50)
  .lean();

// Public Product List
const products = await Product.find({ status: 'active' })
  .select('name slug price discount thumbnail rating reviewCount')
  .populate('category', 'name slug')  // Only category name
  .limit(20)
  .lean();

// Order Detail (Customer view)
const order = await Order.findById(id)
  .select('-paymentToken -internalNotes')  // Exclude internal
  .populate('items.product', 'name thumbnail')  // Only display fields
  .populate('customer', 'name email')  // Customer info
  .lean();
```

---

## **Repository Implementation:**

```javascript
class UserRepository {
  // Default select - common fields
  defaultSelect = 'name email role status createdAt';
  
  async findById(id, selectFields = this.defaultSelect) {
    const query = User.findById(id);
    if (selectFields) {
      query.select(selectFields);
    }
    return await query.lean();
  }
  
  async findPublicProfile(id) {
    return await User.findById(id)
      .select('name avatar bio')  // Public fields only
      .lean();
  }
  
  async findPrivateProfile(id) {
    return await User.findById(id)
      .select('-password -resetToken')  // Exclude sensitive
      .lean();
  }
}
```

---

# 4️⃣ Cursor Pagination - Kahan Aur Kaise

## **Kahan Use Karein:**

### ✅ Large Lists (Always)
```javascript
// ❌ BAD - Traditional pagination (slow, unreliable)
const users = await User.find({})
  .skip(20000)    // Skip 20,000 records - SLOW!
  .limit(20);

// ✅ GOOD - Cursor pagination (fast, reliable)
const users = await User.find({ _id: { $gt: lastId } })
  .limit(20)
  .sort({ _id: 1 });
```

---

## **Implementation Strategy:**

### Option 1: ID-based (Simple)
```javascript
// Best for: Default _id sorting

// Repository
async findWithCursor(filter = {}, limit = 20, cursor = null) {
  const query = { ...filter };
  
  // If cursor provided, fetch after this ID
  if (cursor) {
    query._id = { $gt: cursor };  // Greater than last ID
  }
  
  const items = await this.model.find(query)
    .limit(limit + 1)  // Extra item to check hasNextPage
    .sort({ _id: 1 })   // Ascending
    .lean();
  
  const hasNextPage = items.length > limit;
  const results = hasNextPage ? items.slice(0, limit) : items;
  
  const nextCursor = hasNextPage ? results[results.length - 1]._id : null;
  
  return { items: results, nextCursor, hasNextPage };
}

// Usage
const { items, nextCursor, hasNextPage } = await userRepo.findWithCursor(
  { status: 'active' },
  20,
  req.query.cursor  // Last ID from previous page
);

// Frontend
if (hasNextPage) {
  // Show "Load More" button
  // Next request: /api/users?cursor=nextCursor
}
```

---

### Option 2: Timestamp + ID (Better for Sorting)
```javascript
// Best for: createdAt sorting, time-based feeds

// Repository
async findWithCursor(filter = {}, sort = { createdAt: -1 }, limit = 20, cursor = null) {
  const query = { ...filter };
  
  if (cursor) {
    const [cursorTime, cursorId] = cursor.split('_');
    
    // Hybrid cursor: timestamp + ID
    query.$or = [
      { createdAt: { $lt: new Date(Number(cursorTime)) } },
      {
        createdAt: new Date(Number(cursorTime)),
        _id: { $lt: cursorId }  // Tie-breaker
      }
    ];
  }
  
  const items = await this.model.find(query)
    .sort({ createdAt: -1, _id: -1 })  // Both fields sort
    .limit(limit + 1)
    .lean();
  
  const hasNextPage = items.length > limit;
  const results = hasNextPage ? items.slice(0, limit) : items;
  
  let nextCursor = null;
  if (hasNextPage && results.length > 0) {
    const last = results[results.length - 1];
    nextCursor = `${last.createdAt.getTime()}_${last._id}`;
  }
  
  return { items: results, nextCursor, hasNextPage };
}

// Usage
const { items, nextCursor } = await productRepo.findWithCursor(
  { category: 'electronics' },
  { createdAt: -1 },
  20,
  req.query.cursor  // "1707832800000_65c8a2b1..."
);
```

---

### Option 3: Seek Method (For Complex Sorting)
```javascript
// Best for: Any sort field (price, name, etc.)

async findWithSeek(filter = {}, sortField = 'price', sortOrder = 1, limit = 20, cursor = null) {
  const query = { ...filter };
  
  if (cursor) {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString());
    // { price: 999, _id: '65c8a2b1...' }
    
    const operator = sortOrder === 1 ? '$gt' : '$lt';
    
    query.$or = [
      { [sortField]: { [operator]: parsed[sortField] } },
      {
        [sortField]: parsed[sortField],
        _id: { [operator]: parsed._id }
      }
    ];
  }
  
  const items = await this.model.find(query)
    .sort({ [sortField]: sortOrder, _id: sortOrder })
    .limit(limit + 1)
    .lean();
  
  const hasNextPage = items.length > limit;
  const results = hasNextPage ? items.slice(0, limit) : items;
  
  let nextCursor = null;
  if (hasNextPage) {
    const last = results[results.length - 1];
    nextCursor = Buffer.from(JSON.stringify({
      [sortField]: last[sortField],
      _id: last._id
    })).toString('base64');
  }
  
  return { items: results, nextCursor, hasNextPage };
}
```

---

## **Complete Repository Example:**

```javascript
class ProductRepository {
  async findAllWithPagination(options = {}) {
    const {
      category,
      minPrice,
      maxPrice,
      sortBy = 'newest',  // newest, price_low, price_high, popular
      limit = 20,
      cursor = null
    } = options;
    
    // 1. Build filter
    const filter = { status: 'active' };
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = minPrice;
      if (maxPrice) filter.price.$lte = maxPrice;
    }
    
    // 2. Determine sort and cursor logic
    let sort = {};
    let cursorQuery = {};
    
    switch (sortBy) {
      case 'newest':
        sort = { createdAt: -1, _id: -1 };
        if (cursor) {
          const [time, id] = cursor.split('_');
          cursorQuery.$or = [
            { createdAt: { $lt: new Date(Number(time)) } },
            { createdAt: new Date(Number(time)), _id: { $lt: id } }
          ];
        }
        break;
        
      case 'price_low':
        sort = { price: 1, _id: 1 };
        if (cursor) {
          const [price, id] = cursor.split('_');
          cursorQuery.$or = [
            { price: { $gt: Number(price) } },
            { price: Number(price), _id: { $gt: id } }
          ];
        }
        break;
        
      case 'price_high':
        sort = { price: -1, _id: -1 };
        if (cursor) {
          const [price, id] = cursor.split('_');
          cursorQuery.$or = [
            { price: { $lt: Number(price) } },
            { price: Number(price), _id: { $lt: id } }
          ];
        }
        break;
    }
    
    // 3. Execute query
    const query = { ...filter, ...cursorQuery };
    const items = await Product.find(query)
      .select('name slug price thumbnail rating reviewCount discount')
      .populate('category', 'name slug')
      .sort(sort)
      .limit(limit + 1)
      .lean();
    
    // 4. Build response
    const hasNextPage = items.length > limit;
    const results = hasNextPage ? items.slice(0, limit) : items;
    
    let nextCursor = null;
    if (hasNextPage && results.length > 0) {
      const last = results[results.length - 1];
      switch (sortBy) {
        case 'newest':
          nextCursor = `${last.createdAt.getTime()}_${last._id}`;
          break;
        case 'price_low':
        case 'price_high':
          nextCursor = `${last.price}_${last._id}`;
          break;
      }
    }
    
    return {
      items: results,
      nextCursor,
      hasNextPage,
      limit
    };
  }
}

// Controller Usage
class ProductController {
  getProducts = catchAsync(async (req, res) => {
    const result = await productRepo.findAllWithPagination({
      category: req.query.category,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      sortBy: req.query.sortBy || 'newest',
      limit: parseInt(req.query.limit) || 20,
      cursor: req.query.cursor  // undefined for first page
    });
    
    res.json({
      success: true,
      data: result.items,
      pagination: {
        nextCursor: result.nextCursor,
        hasNextPage: result.hasNextPage,
        limit: result.limit
      }
    });
  });
}

// Frontend (React Example)
function ProductList() {
  const [products, setProducts] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  
  const loadProducts = async (cursor = null) => {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    params.append('limit', '20');
    
    const res = await fetch(`/api/products?${params}`);
    const data = await res.json();
    
    if (cursor) {
      setProducts(prev => [...prev, ...data.data]);
    } else {
      setProducts(data.data);
    }
    
    setNextCursor(data.pagination.nextCursor);
    setHasMore(data.pagination.hasNextPage);
  };
  
  return (
    <div>
      {products.map(p => <ProductCard key={p._id} product={p} />)}
      {hasMore && (
        <button onClick={() => loadProducts(nextCursor)}>
          Load More
        </button>
      )}
    </div>
  );
}
```

---

## **Kahan Cursor Pagination NA Use Karein:**

```javascript
// ❌ Small datasets (< 1000 records)
const roles = await Role.find({}).lean();  // No pagination needed

// ❌ Admin panels (fixed size)
const settings = await Setting.find({}).lean();  // Always < 100

// ❌ When total count chahiye ho
// Cursor mein total count nahi milta easily
// Traditional pagination use karo with estimatedDocumentCount()
```

---

# 🎯 EXPERT SUMMARY

## Index Strategy:
- ✅ Unique fields pe hamesha
- ✅ Foreign keys pe hamesha
- ✅ Frequently filtered fields pe
- ✅ Compound indexes for multi-field queries
- ❌ Boolean alone, arrays, write-heavy fields pe mat lagao

## .lean() Strategy:
- ✅ READ operations pe hamesha
- ❌ CREATE, UPDATE with save(), DELETE with remove() pe mat lagao
- ❌ Virtuals/middleware chahiye ho toh mat lagao

## .select() Strategy:
- ✅ Public APIs pe hamesha
- ✅ List views pe hamesha
- ✅ Populate ke saath selective fields hamesha
- ✅ Sensitive data exclude karo (-password)

## Cursor Pagination:
- ✅ Large lists (> 1000 records)
- ✅ Infinite scroll interfaces
- ✅ Time-based feeds
- ❌ Small datasets, admin panels pe mat use karo

---

**Yeh pattern follow karo toh experienced developer jaisa code likhoge! 🚀**
