// Simulate Firestore Timestamp behavior

// Case 1: Creating a timestamp from local time
const localDate = new Date();
localDate.setHours(8, 0, 0, 0);
console.log('Local date created:', localDate);
console.log('  toISOString():', localDate.toISOString());
console.log('  getHours():', localDate.getHours());

// Case 2: What Timestamp.fromDate does
// It converts the Date to seconds/milliseconds since epoch
// Then .toDate() creates a new Date from the same epoch value
const epochMS = localDate.getTime();
const reconstructed = new Date(epochMS);
console.log('\nAfter round-trip:');
console.log('  reconstructed:', reconstructed);
console.log('  toISOString():', reconstructed.toISOString());
console.log('  getHours():', reconstructed.getHours());
console.log('  same?', localDate.getTime() === reconstructed.getTime());

// Case 3: Comparing dates
const selectedDate = new Date();
selectedDate.setHours(0, 0, 0, 0);
console.log('\nselectedDate:', selectedDate);

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

console.log('isSameDay(reconstructed, selectedDate):', isSameDay(reconstructed, selectedDate));
