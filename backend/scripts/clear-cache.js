/**
 * Script to clear all cached data
 * Can be run from command line: node scripts/clear-cache.js
 */

const cache = require('../src/utils/cache');

console.log('🧹 Clearing cache...\n');

const statsBefore = cache.getStats();
console.log('📊 Cache before:');
console.log(`   Total entries: ${statsBefore.total}`);
console.log(`   Valid entries: ${statsBefore.valid}`);
console.log(`   Expired entries: ${statsBefore.expired}\n`);

cache.clear();

const statsAfter = cache.getStats();
console.log('✅ Cache cleared!');
console.log(`📊 Cache after: ${statsAfter.total} entries\n`);

console.log(`🗑️  Removed ${statsBefore.total} cache entries`);

