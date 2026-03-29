import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import Branding from '../components/Branding';

export default function More({ setActivePage }) {
  const { profile } = useAuth();
  const { pantry, chores } = useData();

  const lowStockCount = pantry.filter((p) => p.low_stock).length;
  const dailyChores = chores.filter((c) => c.type === 'daily');
  const completedDaily = dailyChores.filter((c) => c.completed).length;

  const items = [
    {
      id: 'pantry',
      icon: '\uD83C\uDFE0',
      title: 'Pantry',
      subtitle: `${pantry.length} items${lowStockCount > 0 ? ` \u00B7 ${lowStockCount} low stock` : ''}`,
      color: 'var(--accent-light)'
    },
    {
      id: 'chores',
      icon: '\u2705',
      title: 'Chores',
      subtitle: dailyChores.length > 0 ? `${completedDaily}/${dailyChores.length} done today` : 'Track daily & weekly tasks',
      color: 'var(--success-light)'
    },
    {
      id: 'settings',
      icon: '\u2699\uFE0F',
      title: 'Settings',
      subtitle: 'Dark mode, categories, account',
      color: 'var(--surface-2)'
    }
  ];

  return (
    <div className="page">
      <div className="page-title">More</div>
      <div className="page-subtitle">
        {profile?.display_name ? `Hi, ${profile.display_name}` : 'Manage your Ghar'}
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          className="more-card clickable"
          onClick={() => setActivePage(item.id)}
          style={{ background: item.color }}
        >
          <span className="more-card-icon">{item.icon}</span>
          <div>
            <div className="more-card-title">{item.title}</div>
            <div className="more-card-subtitle">{item.subtitle}</div>
          </div>
          <span className="more-card-arrow">{'\u203A'}</span>
        </div>
      ))}

      <Branding />
    </div>
  );
}
