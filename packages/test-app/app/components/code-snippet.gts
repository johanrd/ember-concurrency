import Component from '@glimmer/component';
import { getCodeSnippet } from 'ember-code-snippet';
import { cached } from '@glimmer/tracking';
import { htmlSafe } from '@ember/template';
import type { SafeString } from '@ember/template';

// Prism's core bundle ships markup/css/clike/javascript; the rest are opt-in.
import Prism from 'prismjs';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-bash';
import 'prismjs/plugins/normalize-whitespace/prism-normalize-whitespace';

type Signature = {
  Args: {
    name: string;
  };
};

export default class CodeSnippet extends Component<Signature> {
  @cached
  get snippet() {
    return getCodeSnippet(this.args.name);
  }

  get language() {
    if (this.snippet.language === 'handlebars') {
      return 'markup';
    }

    if (this.snippet.language === 'gts') {
      return 'typescript';
    }

    return this.snippet.language;
  }

  get source() {
    return Prism.plugins.NormalizeWhitespace.normalize(this.snippet.source);
  }

  /** Null for languages Prism has no grammar for, so we render plain text. */
  get highlighted(): SafeString | null {
    const grammar = Prism.languages[this.language];

    return grammar
      ? htmlSafe(Prism.highlight(this.source, grammar, this.language))
      : null;
  }

  <template>
    <pre class='language-{{this.language}}'><code
        class='code-snippet language-{{this.language}}'
      >{{#if
          this.highlighted
        }}{{this.highlighted}}{{else}}{{this.source}}{{/if}}</code></pre>
  </template>
}
