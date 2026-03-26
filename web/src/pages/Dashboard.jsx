import { useState } from 'react'
import { Link } from 'react-router-dom'

const focusAreas = [
  { title: 'Critical labs', detail: '3 results awaiting sign-off' },
  { title: 'Upcoming visits', detail: '5 patients to round on' },
  { title: 'Family check-ins', detail: '2 priority conversations' }
]

const timelineEvents = [
  {
    time: '09:30',
    title: 'Telehealth: Patient Visit',
    owner: 'Dr. Reyes',
    status: 'upcoming'
  },
  {
    time: '10:15',
    title: 'In-clinic: Follow-up',
    owner: 'Dr. Cho',
    status: 'completed'
  },
  {
    time: '11:00',
    title: 'Care-coord sync',
    owner: 'Team Huddle',
    status: 'upcoming'
  }
]

export default function Dashboard() {
  const [stats] = useState({
    totalPatients: 48,
    newPatients: 5,
    appointments: 12,
    pending: 3
  })

  const statCards = [
    { label: 'Total Patients', value: stats.totalPatients, change: '+4 this week' },
    { label: 'New Admissions', value: stats.newPatients, change: '+2 today' },
    { label: 'Scheduled Appointments', value: stats.appointments, change: '+6 confirmed' },
    { label: 'Pending Actions', value: stats.pending, change: 'Needs review', changeTone: 'negative' }
  ]

  return (
    <div className="page-container page-dashboard">
      <section className="dashboard-hero">
        <div className="dashboard-hero__content">
          <p className="eyebrow">Care runway</p>
          <h2>Start the day knowing what's essential.</h2>
          <p>Align the team, review alerts, and make every patient moment count.</p>
          <div className="dashboard-hero__stats">
            <div>
              <span className="dashboard-hero__value">{stats.totalPatients}</span>
              <span className="dashboard-hero__label">patients today</span>
            </div>
            <div>
              <span className="dashboard-hero__delta">+4 vs yesterday</span>
            </div>
          </div>
        </div>
        <div className="dashboard-hero__badge">Priority care</div>
      </section>

      <div className="stats-grid">
        {statCards.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <div className="stat-card__value">{stat.value}</div>
            <div className="stat-card__label">{stat.label}</div>
            <div className={`stat-card__change ${stat.changeTone === 'negative' ? 'stat-card__change--negative' : ''}`}>
              {stat.change}
            </div>
          </div>
        ))}
      </div>

      <div className="card dashboard-actions-card">
        <div className="card-content">
          <p className="dashboard-actions-helper">Need to act fast? Capture details or invite the team.</p>
          <div className="dashboard-actions-row">
            <Link to="/patients/new" className="btn btn-primary">
              ➕ Add patient
            </Link>
            <Link to="/patients" className="btn btn-secondary">
              👥 View all patients
            </Link>
          </div>
        </div>
      </div>

      <div className="dashboard-panel-grid">
        <article className="dashboard-panel">
          <div className="panel-title">Focus areas</div>
          {focusAreas.map((area) => (
            <div className="focus-item" key={area.title}>
              <strong>{area.title}</strong>
              <span>{area.detail}</span>
            </div>
          ))}
        </article>
        <article className="dashboard-panel">
          <div className="panel-title">Today&apos;s timeline</div>
          <ul className="activity-list">
            {timelineEvents.map((event) => (
              <li key={event.time + event.title}>
                <span className="activity-time">{event.time}</span>
                <div className="activity-details">
                  <span className="activity-event">{event.title}</span>
                  <span className="activity-owner">{event.owner}</span>
                  <span
                    className={`activity-status ${
                      event.status === 'completed' ? 'activity-status--completed' : 'activity-status--upcoming'
                    }`}
                  >
                    {event.status === 'completed' ? 'Completed' : 'Upcoming'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </div>
  )
}
