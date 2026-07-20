const sections = [
  ['currency', '💶', 'Валюта и баланс', 'Стартовый баланс, валюты и курсы'],
  ['family', '👨‍👩‍👧‍👦', 'Семья', 'Название семьи и участники'],
  ['appearance', '🎨', 'Оформление', 'Тема и акцентный цвет'],
  ['categories', '🏷️', 'Категории', 'Доходы, расходы и лимиты'],
  ['data', '🗂️', 'Данные', 'Экспорт и повторная настройка']
];

function SettingsPage({ onOpenSection, onSignOut }) {
  return <div className="screen settings-screen settings-menu-screen">
    <header className="topbar"><div><p className="eyebrow">Профиль и приложение</p><h2>Настройки</h2></div></header>
    <section className="settings-menu" aria-label="Разделы настроек">
      {sections.map(([id, icon, title, description]) => <button key={id} className="settings-menu-row" type="button" onClick={() => onOpenSection(id)}>
        <span className="settings-menu-row__icon" aria-hidden="true">{icon}</span>
        <span className="settings-menu-row__content"><strong>{title}</strong><small>{description}</small></span>
        <span className="settings-menu-row__arrow" aria-hidden="true">›</span>
      </button>)}
    </section>
    <section className="card settings-signout"><p className="muted">Выход завершит сессию только на этом устройстве.</p><button className="danger-btn settings-signout__button" type="button" onClick={onSignOut}>Выйти из аккаунта</button></section>
  </div>;
}

export default SettingsPage;
