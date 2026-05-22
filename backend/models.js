const mongoose = require('mongoose');

mongoose.set('bufferCommands', false);

let forceMemoryStore = false;

const stores = {
  Batch: [],
  SubBatch: [],
  ChildQR: [],
  User: [],
  ScanLog: []
};

const modelConfig = {
  Batch: {
    unique: ['batchId'],
    required: ['batchId', 'productVariant', 'manufacturerAddress', 'polygonTxHash', 'totalUnits'],
    defaults: { createdAt: () => new Date() }
  },
  SubBatch: {
    unique: ['subBatchId'],
    required: ['subBatchId', 'parentBatchId', 'assignedDistributorId'],
    defaults: { isActivated: false }
  },
  ChildQR: {
    unique: ['childId'],
    required: ['childId', 'subBatchId'],
    defaults: { status: 'INACTIVE', scanCount: 0 },
    enums: { status: ['INACTIVE', 'ACTIVE'] }
  },
  User: {
    unique: ['email'],
    required: ['email', 'password', 'role', 'name'],
    enums: { role: ['MANUFACTURER', 'DISTRIBUTOR', 'ADMIN'] }
  },
  ScanLog: {
    required: ['childId', 'location', 'status'],
    defaults: { timestamp: () => new Date(), anomalyScore: 0, isThreat: false }
  }
};

const shouldUseMongo = () => !forceMemoryStore && mongoose.connection.readyState === 1;

const setUseMemoryStore = (useMemory) => {
  forceMemoryStore = Boolean(useMemory);
};

const isUsingMemoryStore = () => !shouldUseMongo();

const createId = () => new mongoose.Types.ObjectId().toString();

const cloneValue = (value) => {
  if (value instanceof Date) return new Date(value.getTime());
  if (Array.isArray(value)) return value.map(cloneValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, cloneValue(nested)]));
  }
  return value;
};

const getByPath = (object, path) => path.split('.').reduce((current, part) => {
  if (current === undefined || current === null) return undefined;
  return current[part];
}, object);

const valuesEqual = (left, right) => {
  if (left instanceof Date && right instanceof Date) return left.getTime() === right.getTime();
  if (left instanceof Date) return left.getTime() === new Date(right).getTime();
  if (right instanceof Date) return new Date(left).getTime() === right.getTime();
  return left === right;
};

const matchesFilter = (document, filter = {}) => Object.entries(filter).every(([key, expected]) => {
  const actual = getByPath(document, key);

  if (
    expected &&
    typeof expected === 'object' &&
    !(expected instanceof Date) &&
    !Array.isArray(expected)
  ) {
    return Object.entries(expected).every(([operator, value]) => {
      if (operator === '$gte') return actual >= value;
      if (operator === '$gt') return actual > value;
      if (operator === '$lte') return actual <= value;
      if (operator === '$lt') return actual < value;
      if (operator === '$in') return Array.isArray(value) && value.includes(actual);
      return valuesEqual(actual, value);
    });
  }

  return valuesEqual(actual, expected);
});

const applySort = (documents, sortSpec) => {
  if (!sortSpec) return documents;

  const entries = Object.entries(sortSpec);
  return [...documents].sort((left, right) => {
    for (const [field, direction] of entries) {
      const a = getByPath(left, field);
      const b = getByPath(right, field);
      const leftValue = a instanceof Date ? a.getTime() : a;
      const rightValue = b instanceof Date ? b.getTime() : b;

      if (leftValue < rightValue) return direction === -1 ? 1 : -1;
      if (leftValue > rightValue) return direction === -1 ? -1 : 1;
    }
    return 0;
  });
};

const duplicateKeyError = (field, value) => {
  const error = new Error(`Duplicate key for ${field}`);
  error.code = 11000;
  error.keyPattern = { [field]: 1 };
  error.keyValue = { [field]: value };
  return error;
};

const validateMemoryDocument = (modelName, document) => {
  const config = modelConfig[modelName] || {};

  for (const field of config.required || []) {
    const value = getByPath(document, field);
    if (value === undefined || value === null || value === '') {
      const error = new Error(`${field} is required`);
      error.name = 'ValidationError';
      throw error;
    }
  }

  for (const [field, allowed] of Object.entries(config.enums || {})) {
    const value = getByPath(document, field);
    if (value !== undefined && !allowed.includes(value)) {
      const error = new Error(`${field} must be one of: ${allowed.join(', ')}`);
      error.name = 'ValidationError';
      throw error;
    }
  }
};

class MemoryDocument {
  constructor(modelName, data = {}) {
    const config = modelConfig[modelName] || {};

    Object.assign(this, cloneValue(data));
    this._modelName = modelName;
    this._id = this._id || createId();

    for (const [field, defaultValue] of Object.entries(config.defaults || {})) {
      if (this[field] === undefined) {
        this[field] = typeof defaultValue === 'function' ? defaultValue() : cloneValue(defaultValue);
      }
    }
  }

  async save() {
    const store = stores[this._modelName];
    const config = modelConfig[this._modelName] || {};

    validateMemoryDocument(this._modelName, this);

    for (const field of config.unique || []) {
      const duplicate = store.find((document) => document._id !== this._id && valuesEqual(document[field], this[field]));
      if (duplicate) throw duplicateKeyError(field, this[field]);
    }

    const existingIndex = store.findIndex((document) => document._id === this._id);
    if (existingIndex >= 0) {
      store[existingIndex] = this;
    } else {
      store.push(this);
    }

    return this;
  }

  toObject() {
    const copy = cloneValue(this);
    delete copy._modelName;
    return copy;
  }

  toJSON() {
    return this.toObject();
  }
}

class MemoryQuery {
  constructor(executor) {
    this.executor = executor;
    this.sortSpec = null;
    this.limitCount = null;
  }

  select() {
    return this;
  }

  sort(sortSpec) {
    this.sortSpec = sortSpec;
    return this;
  }

  limit(limitCount) {
    this.limitCount = limitCount;
    return this;
  }

  async exec() {
    return this.executor({
      sortSpec: this.sortSpec,
      limitCount: this.limitCount
    });
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }

  finally(callback) {
    return this.exec().finally(callback);
  }
}

const createMemoryDocument = (modelName, data) => new MemoryDocument(modelName, data);

const createHybridModel = (modelName, mongooseModel) => {
  return class HybridModel {
    constructor(data) {
      if (shouldUseMongo()) return new mongooseModel(data);
      return createMemoryDocument(modelName, data);
    }

    static findOne(filter = {}) {
      if (shouldUseMongo()) return mongooseModel.findOne(filter);

      return new MemoryQuery(({ sortSpec }) => {
        const documents = stores[modelName].filter((document) => matchesFilter(document, filter));
        return applySort(documents, sortSpec)[0] || null;
      });
    }

    static find(filter = {}) {
      if (shouldUseMongo()) return mongooseModel.find(filter);

      return new MemoryQuery(({ sortSpec, limitCount }) => {
        let documents = stores[modelName].filter((document) => matchesFilter(document, filter));
        documents = applySort(documents, sortSpec);
        if (typeof limitCount === 'number') documents = documents.slice(0, limitCount);
        return documents;
      });
    }

    static async countDocuments(filter = {}) {
      if (shouldUseMongo()) return mongooseModel.countDocuments(filter);
      return stores[modelName].filter((document) => matchesFilter(document, filter)).length;
    }

    static async insertMany(documents = []) {
      if (shouldUseMongo()) return mongooseModel.insertMany(documents);

      const createdDocuments = [];
      for (const document of documents) {
        const memoryDocument = createMemoryDocument(modelName, document);
        await memoryDocument.save();
        createdDocuments.push(memoryDocument);
      }
      return createdDocuments;
    }

    static async updateMany(filter = {}, update = {}) {
      if (shouldUseMongo()) return mongooseModel.updateMany(filter, update);

      let modifiedCount = 0;
      for (const document of stores[modelName]) {
        if (!matchesFilter(document, filter)) continue;

        if (update.$set) Object.assign(document, cloneValue(update.$set));
        modifiedCount += 1;
      }
      return { acknowledged: true, modifiedCount };
    }
  };
};

// Batch Schema: Tracks master manufacturing lots
const BatchSchema = new mongoose.Schema({
  batchId: { type: String, required: true, unique: true },
  productVariant: { type: String, required: true },
  manufacturerAddress: { type: String, required: true },
  polygonTxHash: { type: String, required: true },
  totalUnits: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Sub-Batch Schema: Cartons / groups assigned to distributors for JIT activation
const SubBatchSchema = new mongoose.Schema({
  subBatchId: { type: String, required: true, unique: true },
  parentBatchId: { type: String, required: true },
  assignedDistributorId: { type: String, required: true },
  isActivated: { type: Boolean, default: false },
  activatedAt: { type: Date }
});

// Child QR Schema: Individual containers (cryptographically generated, inactive by default)
const ChildQRSchema = new mongoose.Schema({
  childId: { type: String, required: true, unique: true },
  subBatchId: { type: String, required: true },
  status: { type: String, enum: ['INACTIVE', 'ACTIVE'], default: 'INACTIVE' },
  scanCount: { type: Number, default: 0 },
  lastScannedAt: { type: Date }
});

// User Schema: For manufacturer/distributor/admin logins
const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: String,
    enum: ['MANUFACTURER', 'DISTRIBUTOR', 'ADMIN'],
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  }
});

// Scan Log Schema: Telemetry entries parsed by the AI isolation engine
const ScanLogSchema = new mongoose.Schema({
  childId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    name: { type: String, required: true }
  },
  status: { type: String, required: true },
  anomalyScore: { type: Number, default: 0 },
  isThreat: { type: Boolean, default: false },
  threatReason: { type: String }
});

const mongooseModels = {
  Batch: mongoose.model('Batch', BatchSchema),
  SubBatch: mongoose.model('SubBatch', SubBatchSchema),
  ChildQR: mongoose.model('ChildQR', ChildQRSchema),
  User: mongoose.model('User', UserSchema),
  ScanLog: mongoose.model('ScanLog', ScanLogSchema)
};

module.exports = {
  Batch: createHybridModel('Batch', mongooseModels.Batch),
  SubBatch: createHybridModel('SubBatch', mongooseModels.SubBatch),
  ChildQR: createHybridModel('ChildQR', mongooseModels.ChildQR),
  User: createHybridModel('User', mongooseModels.User),
  ScanLog: createHybridModel('ScanLog', mongooseModels.ScanLog),
  setUseMemoryStore,
  isUsingMemoryStore
};
