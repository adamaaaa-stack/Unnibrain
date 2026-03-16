import { CreateCourseForm } from "@/features/course-create/create-course-form";

export default function NewCoursePage() {
  return (
    <section className="card-surface space-y-5 p-5 sm:p-6">
      <div className="space-y-1">
        <h1 className="font-[var(--font-heading)] text-2xl font-semibold text-slate-900">Create a new course</h1>
        <p className="text-sm text-slate-600">Paste notes or upload files. UniBrain will extract and normalize text for generation.</p>
      </div>
      <CreateCourseForm />
    </section>
  );
}
