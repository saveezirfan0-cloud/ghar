const TABS = [
  { id: 'dashboard', icon: '\uD83C\uDFE0', label: 'Home' },
  { id: 'meals', icon: '\uD83C\uDF72', label: 'Meals' },
  { id: 'planner', icon: '\uD83D\uDCC5', label: 'Plan' },
  { id: 'grocery', icon: '\uD83D\uDED2', label: 'Grocery' },
  { id: 'more', icon: '\u2630', label: 'More' }
];

export default function BottomNav({ activePage, setActivePage, groceryCount }) {
  const isMoreActive = ['pantry', 'chores', 'settings'].includes(activePage);

  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => {
        const active = tab.id === 'more' ? isMoreActive : activePage === tab.id;
        return (
          <div
            key={tab.id}
            className={`nav-item ${active ? 'active' : ''}`}
            onClick={() => setActivePage(tab.id === 'more' ? 'more' : tab.id)}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
            {tab.id === 'grocery' && groceryCount > 0 && (
              <span className="badge-nav">{groceryCount > 99 ? '99+' : groceryCount}</span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
