FROM jekyll/jekyll:4.2.2

WORKDIR /srv/jekyll
COPY . .

# Install your dependencies (Gemfile + Gemfile.lock must be copied above)
RUN bundle install

EXPOSE 4000
CMD ["jekyll", "serve", "--host", "0.0.0.0", "--livereload"]
