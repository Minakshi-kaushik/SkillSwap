import { useMemo, useState } from 'react'
import { DemoContext } from './demo-context'

const initialDemo = {
  profile: {
    full_name: 'Aanya Sharma', username: 'aanya_sharma', college: 'IGDTUW', bio: 'Computer science student who enjoys sharing what I know and learning by building things with others.', location: 'Delhi, India', languages: ['English', 'Hindi'], learning_style: 'VISUAL', session_mode: 'ONLINE', timezone: 'Asia/Kolkata', avatar_url: '',
  },
  skills: {
    teach: [
      { id: 'demo-teach-python', skill_id: 'demo-python', skill_name: 'Python', skill_type: 'TEACH', proficiency_level: 'INTERMEDIATE', category: 'PROGRAMMING' },
      { id: 'demo-teach-public-speaking', skill_id: 'demo-public-speaking', skill_name: 'Public Speaking', skill_type: 'TEACH', proficiency_level: 'ADVANCED', category: 'COMMUNICATION' },
    ],
    learn: [
      { id: 'demo-learn-react', skill_id: 'demo-react', skill_name: 'React', skill_type: 'LEARN', proficiency_level: 'BEGINNER', category: 'PROGRAMMING' },
      { id: 'demo-learn-ux', skill_id: 'demo-ux', skill_name: 'UI/UX Design', skill_type: 'LEARN', proficiency_level: 'INTERMEDIATE', category: 'DESIGN' },
    ],
  },
  goals: [
    { id: 'demo-goal-1', title: 'Build a React portfolio', description: 'Create and publish a polished portfolio site.', goal_type: 'PROJECT', status: 'ACTIVE', progress: { total: 5, completed: 2, in_progress: 1, overall_percentage: 45 } },
    { id: 'demo-goal-2', title: 'Improve visual design skills', description: 'Practice layout, color, and typography fundamentals.', goal_type: 'SKILL', status: 'PAUSED', progress: { total: 4, completed: 1, in_progress: 0, overall_percentage: 25 } },
    { id: 'demo-goal-3', title: 'Give a confident project presentation', description: 'Prepare and deliver a short project talk.', goal_type: 'CAREER', status: 'COMPLETED', progress: { total: 3, completed: 3, in_progress: 0, overall_percentage: 100 } },
  ],
  availability: {
    timezone: 'Asia/Kolkata', slots: [
      { id: 'demo-slot-1', day_of_week: 1, start_time: '18:00', end_time: '20:00', is_active: true },
      { id: 'demo-slot-2', day_of_week: 3, start_time: '17:30', end_time: '19:00', is_active: true },
      { id: 'demo-slot-3', day_of_week: 6, start_time: '10:00', end_time: '12:00', is_active: true },
    ],
  },
}

export function DemoProvider({ children }) {
  const [profile, setProfile] = useState(initialDemo.profile)
  const [skills, setSkills] = useState(initialDemo.skills)
  const [goals, setGoals] = useState(initialDemo.goals)
  const [availability, setAvailability] = useState(initialDemo.availability)
  const value = useMemo(() => ({ profile, setProfile, skills, setSkills, goals, setGoals, availability, setAvailability }), [profile, skills, goals, availability])
  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}
