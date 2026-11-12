import { redirect } from "next/navigation";
import { getPageUser } from "@/lib/page-session";
import { LandingHeader } from "./landing/LandingHeader";
import { LandingHero } from "./landing/LandingHero";
import { SubjectStrip } from "./landing/SubjectStrip";
import { WelcomeSection } from "./landing/WelcomeSection";
import { FeatureGrid } from "./landing/FeatureGrid";
import { AudienceSection } from "./landing/AudienceSection";
import { HowItWorks } from "./landing/HowItWorks";
import { FaqSection } from "./landing/FaqSection";
import { FinalCta } from "./landing/FinalCta";
import { LandingFooter } from "./landing/LandingFooter";

export default async function Home() {
  const user = await getPageUser();
  if (user) {
    redirect(user.role === "TEACHER" ? "/dashboard/teacher" : "/dashboard/student");
  }

  return (
    <>
      <LandingHeader />
      <main className="flex-1">
        <LandingHero />
        <SubjectStrip />
        <WelcomeSection />
        <FeatureGrid />
        <AudienceSection
          id="for-teachers"
          eyebrow="For teachers"
          heading="Run your classes without the paperwork"
          bullets={[
            "Set up Physics, Chemistry and Biology classes in minutes",
            "Assign work to any class and set it live",
            "Track who has started and who has finished",
            "Get flagged when a student needs a nudge",
          ]}
          ctaLabel="Start as a teacher"
        />
        <AudienceSection
          id="for-students"
          eyebrow="For students"
          heading="Know exactly what to do next"
          bullets={[
            "Join a class with a code from your teacher",
            "See all your assigned work in one place",
            "Know what to do next at a glance",
            "Pick up where you left off on any device",
          ]}
          ctaLabel="Join a class"
        />
        <HowItWorks />
        <FaqSection />
        <FinalCta />
      </main>
      <LandingFooter />
    </>
  );
}
