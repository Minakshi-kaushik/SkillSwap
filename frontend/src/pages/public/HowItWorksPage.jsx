import { ArrowRight, BookOpen, CalendarDays, Check, Compass, MessageCircle, Sparkles, Target, UserRound, UsersRound } from 'lucide-react'
import { Button } from '../../components/common/Button'

const journey = [
  { title: 'Create your profile', text: 'Introduce yourself, your interests, and the kind of learning that feels right for you.', Icon: UserRound },
  { title: 'Add skills to teach', text: 'List the skills or experience you’re happy to share with another learner.', Icon: Sparkles },
  { title: 'Add skills to learn', text: 'Tell the community what you’re curious about and what you hope to practice.', Icon: Target },
  { title: 'Discover compatible people', text: 'Explore members whose interests and skills complement what you’re looking for.', Icon: Compass },
  { title: 'Connect with a learning partner', text: 'Say hello, compare goals, and decide together how you’d like to exchange.', Icon: MessageCircle },
  { title: 'Schedule and complete sessions', text: 'Find a time that works, meet for a learning session, and practice together.', Icon: CalendarDays },
  { title: 'Share feedback and track progress', text: 'Reflect on what you learned, share thoughtful feedback, and keep your progress moving.', Icon: Check },
]

export function HowItWorksPage() {
  return <div className="public-page"><section className="page-hero journey-hero section-container"><span className="eyebrow">How SkillSwap works</span><h1>From curiosity to <em>shared progress.</em></h1><p>A clear path helps you find a learning partner, make time to practice, and keep building on what you learn.</p><Button to="/signup">Start your journey <ArrowRight size={16}/></Button><div className="journey-illustration" aria-hidden="true"><div className="journey-path"/><span className="journey-icon journey-one"><UserRound/></span><span className="journey-icon journey-two"><Sparkles/></span><span className="journey-icon journey-three"><UsersRound/></span><span className="journey-icon journey-four"><BookOpen/></span></div></section>
    <section className="journey-section section-container"><div className="journey-intro"><span className="eyebrow">Your learning journey</span><h2>Seven steps, shaped <em>around you.</em></h2><p>You and your learning partner decide the details together. SkillSwap gives you a place to make the connection.</p></div><div className="journey-list">{journey.map(({ title, text, Icon }, index) => <article className="journey-step" key={title}><span className="journey-index">{String(index + 1).padStart(2, '0')}</span><span className="journey-step-icon"><Icon size={19}/></span><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></section>
    <section className="journey-note section-container"><BookOpen/><div><strong>Make it your own</strong><p>There’s no single right way to learn. Agree on a format, pace, and goal that work for both of you.</p></div><CalendarDays/></section>
    <section className="public-page-cta"><div className="section-container"><h2>Your next skill can start with a hello.</h2><p>Join the exchange and see where your curiosity takes you.</p><Button to="/signup">Get started <ArrowRight size={16}/></Button></div></section></div>
}
