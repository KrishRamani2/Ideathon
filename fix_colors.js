const fs = require('fs');
let css = fs.readFileSync('style.css', 'utf8');

// Replace specific hardcoded colors with variables
css = css.replace(/rgba\(8, 8, 8, 0.96\)/g, 'var(--surface)');
css = css.replace(/rgba\(255, 255, 255, 0.04\)/g, 'var(--border-light)');
css = css.replace(/rgba\(255, 255, 255, 0.03\)/g, 'var(--border-light)');
css = css.replace(/rgba\(255, 255, 255, 0.02\)/g, 'var(--border-light)');
css = css.replace(/rgba\(255, 140, 0, 0.06\)/g, 'var(--accent-dim)');
css = css.replace(/rgba\(10, 10, 10, 0.97\)/g, 'var(--surface)');
css = css.replace(/rgba\(5, 5, 5, 0.7\)/g, 'transparent');
css = css.replace(/#fff\b/g, 'var(--white)');
css = css.replace(/#ffffff/gi, 'var(--white)');
css = css.replace(/#e8e8e8\b/g, 'var(--text)');
css = css.replace(/#8a8a8a\b/g, 'var(--text-dim)');
css = css.replace(/#505050\b/g, 'var(--text-muted)');

// The CSS fraud UI has some hardcoded #ffffff
css = css.replace(/color: #fff;/g, 'color: #ffffff;'); // Revert or fix
css = css.replace(/color: #ffffff;/g, 'color: #ffffff;');

fs.writeFileSync('style.css', css);
console.log('Fixed style.css colors');
