const CATEGORIES = ['main', 'side', 'drink', 'snack'];
module.exports = function schoolStore(sql) {
  const getSchools = () => sql.prepare('SELECT * FROM schools WHERE active=1 ORDER BY sort_order,id').all();
  const getSchoolBySlug = slug => typeof slug === 'string' ? sql.prepare('SELECT * FROM schools WHERE slug=? AND active=1').get(slug) : undefined;
  const getSchoolByName = name => typeof name === 'string' ? sql.prepare('SELECT * FROM schools WHERE name=? AND active=1').get(name) : undefined;
  const getSchoolDailyRate = name => getSchoolByName(name)?.daily_rate_kwd;
  function getSchoolMenuItems(id) {
    return sql.prepare('SELECT m.* FROM menu_items m JOIN school_menu_items sm ON sm.menu_item_id=m.id WHERE sm.school_id=? ORDER BY m.id').all(id)
      .map(m => ({ ...m, allergenFree: JSON.parse(m.allergen_free || '[]') }));
  }
  function getMenuForSchool(id) {
    const items = getSchoolMenuItems(id);
    return CATEGORIES.map(category => ({ category, items: items.filter(m => m.category === category) })).filter(g => g.items.length);
  }
  return { getSchools, getSchoolBySlug, getSchoolByName, getSchoolDailyRate, getSchoolMenuItems, getMenuForSchool };
};
