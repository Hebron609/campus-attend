/**
 * Utility functions for Student ID and Index Number formatting and resolution.
 * Supports academic index numbers (e.g., ADS23B00133Y), formatted university IDs (e.g., STU-0005),
 * and numeric IDs (#5).
 */

export function formatStudentId(student: { id: number; email?: string }): string {
  if (!student) return 'STU-0000';

  // Check if email username is an index number (e.g. ADS23B00133Y@... or STU1234@...)
  if (student.email) {
    const username = student.email.split('@')[0];
    // If username has standard university index pattern (alphanumeric with digits, e.g. ADS23B00133Y or STU001)
    if (/^[A-Za-z]{2,}\d+[A-Za-z0-9]*$/.test(username)) {
      return username.toUpperCase();
    }
  }

  // Standard institutional Student ID format: STU-0005
  return `STU-${String(student.id).padStart(4, '0')}`;
}

/**
 * Checks if a user's search query matches a student's ID, formatted Student ID, or email.
 */
export function matchStudentQuery(
  student: { id: number; name: string; email: string },
  query: string
): boolean {
  if (!query) return false;
  const q = query.trim().toLowerCase();
  const rawId = student.id.toString();
  const formattedId = formatStudentId(student).toLowerCase(); // e.g. stu-0005
  const cleanFormattedId = formattedId.replace(/[^a-z0-9]/g, ''); // e.g. stu0005
  const cleanQ = q.replace(/[^a-z0-9]/g, '');

  return (
    rawId === q ||
    formattedId === q ||
    cleanFormattedId === cleanQ ||
    student.email.toLowerCase() === q ||
    student.email.toLowerCase().startsWith(q) ||
    student.email.split('@')[0].toLowerCase() === q ||
    student.name.toLowerCase().includes(q)
  );
}
