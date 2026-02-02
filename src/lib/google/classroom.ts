import { google } from 'googleapis';
import { setCredentials } from './oauth';
import { 
  ClassroomCourse, 
  ClassroomAssignment, 
  ClassroomStudent, 
  CreateCourseParams 
} from '../types';

/* ===================== CLIENT HELPER ===================== */
async function getClassroomClient() {
  const auth = await setCredentials();
  return google.classroom({ version: 'v1', auth });
}

/* ===================== LIST COURSES ===================== */
export async function listCourses(pageSize: number = 10): Promise<ClassroomCourse[]> {
  const classroom = await getClassroomClient();

  try {
    const res = await classroom.courses.list({
      pageSize,
      // Removed 'courseStates' filter so we can see PROVISIONED courses too
    });

    const courses = res.data.courses || [];

    return courses.map((course) => ({
      id: course.id || '',
      name: course.name || 'Untitled Course',
      section: course.section || '',
      descriptionHeading: course.descriptionHeading || '',
      room: course.room || '',
      enrollmentCode: course.enrollmentCode || '',
      alternateLink: course.alternateLink || '',
      courseState: course.courseState || 'ACTIVE',
    }));
  } catch (error) {
    console.error('Error fetching classrooms:', error);
    throw new Error('Failed to fetch Google Classrooms.');
  }
}

/* ===================== FIND COURSE BY NAME ===================== */
export async function findCourseByName(name: string): Promise<ClassroomCourse | null> {
  const classroom = await getClassroomClient();
  const searchName = name.trim().toLowerCase();

  try {
    const res = await classroom.courses.list({
      pageSize: 20
    });

    const courses = res.data.courses || [];
    const match = courses.find(c => c.name?.toLowerCase().includes(searchName));

    if (!match) return null;

    return {
      id: match.id || '',
      name: match.name || '',
      enrollmentCode: match.enrollmentCode || '',
      alternateLink: match.alternateLink || ''
    };
  } catch (error) {
    console.error('Error searching for course:', error);
    return null;
  }
}

/* ===================== CREATE COURSE (FIXED) ===================== */
export async function createCourse(params: CreateCourseParams): Promise<ClassroomCourse> {
  const classroom = await getClassroomClient();

  try {
    const res = await classroom.courses.create({
      requestBody: {
        name: params.name,
        section: params.section,
        descriptionHeading: params.description,
        room: params.room,
        ownerId: 'me',
        // ✅ FIX: Change 'ACTIVE' to 'PROVISIONED'
        courseState: 'PROVISIONED' 
      }
    });

    const course = res.data;

    return {
      id: course.id || '',
      name: course.name || '',
      section: course.section || '',
      enrollmentCode: course.enrollmentCode || '',
      alternateLink: course.alternateLink || ''
    };
  } catch (error) {
    // Log the specific error message for easier debugging
    console.error('Error creating classroom:', error); 
    throw new Error('Failed to create Google Classroom. Ensure you are a verified Teacher in your domain.');
  }
}

/* ===================== LIST ASSIGNMENTS ===================== */
export async function listAssignments(courseId: string, pageSize: number = 10): Promise<ClassroomAssignment[]> {
  const classroom = await getClassroomClient();

  try {
    const res = await classroom.courses.courseWork.list({
      courseId,
      pageSize,
      orderBy: 'dueDate desc',
      courseWorkStates: ['PUBLISHED']
    });

    const work = res.data.courseWork || [];

    return work.map((w) => ({
      id: w.id || '',
      courseId: w.courseId || '',
      title: w.title || 'Untitled Assignment',
      description: w.description || '',
      dueDate: w.dueDate ? { 
        year: w.dueDate.year || 0, 
        month: w.dueDate.month || 0, 
        day: w.dueDate.day || 0 
      } : undefined,
      dueTime: w.dueTime ? { 
        hours: w.dueTime.hours || 0, 
        minutes: w.dueTime.minutes || 0 
      } : undefined,
      alternateLink: w.alternateLink || '',
      state: w.state || ''
    }));
  } catch (error) {
    console.error(`Error fetching assignments for course ${courseId}:`, error);
    return [];
  }
}

/* ===================== LIST STUDENTS ===================== */
export async function listStudents(courseId: string): Promise<ClassroomStudent[]> {
  const classroom = await getClassroomClient();

  try {
    const res = await classroom.courses.students.list({
      courseId,
      pageSize: 30
    });

    const students = res.data.students || [];

    return students.map((s) => ({
      courseId: s.courseId || '',
      userId: s.userId || '',
      profile: {
        id: s.profile?.id || '',
        name: {
          fullName: s.profile?.name?.fullName || 'Unknown',
          givenName: s.profile?.name?.givenName || '',
          familyName: s.profile?.name?.familyName || ''
        },
        emailAddress: s.profile?.emailAddress || ''
      }
    }));
  } catch (error) {
    console.error(`Error fetching students for course ${courseId}:`, error);
    return [];
  }
}