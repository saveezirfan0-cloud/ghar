const TABS = [
  { id: 'dashboard', icon: '\uD83C\uDFE0', label: 'Home' },
  { id: 'meals', icon: '\uD83C\uDF72', label: 'Meals' },
  { id: 'planner', icon: '\uD83D\uDCC5', label: 'Plan' },
  { id: 'grocery', icon: '\uD83D\uDED2', label: 'Grocery' },
  { id: 'chores', icon: '\u2705', label: 'Chores' }
];

export default function BottomNav({ activePage, setActivePage, groceryCount }) {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <div
          key={tab.id}
          className={`nav-item ${activePage === tab.id ? 'active' : ''}`}
          onClick={() => setActivePage(tab.id)}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
          {tab.id === 'grocery' && groceryCount > 0 && (
            <span className="badge-nav">{groceryCount > 99 ? '99+' : groceryCount}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
