import React from 'react'
import { InputBase } from '@material-ui/core'
import { withStyles } from '@material-ui/core/styles'
import PropTypes from 'prop-types'

class SearchField extends React.Component {

  handleKeyDown (event) {
    const { value, options, onChange, setSelectedItem, selectedItem } = this.props
    const { accept, close } = options

    switch (event.key) {
      case 'Escape': {
        if (value) {
          // Reset value, but prevent spotlight from closing:
          event.stopPropagation()
          onChange('')
        }
        /* let event bubble up to close spotlight. */
        break
      }
      case 'ArrowUp': {
        setSelectedItem(selectedItem - 1)
        break
      }
      case 'ArrowDown': {
        setSelectedItem(selectedItem + 1)
        break
      }
      case 'Enter': {
        if (accept) {
          accept(value)
          close()
        }
      }
    }
  }

  componentDidUpdate () {
    if (!this.props.value) this.input.focus()
  }

  render () {
    const { classes, value, options, onChange } = this.props

    return (
      <InputBase
        className={ classes.searchField }
        autoFocus
        placeholder={ options.placeholder }
        value={ value }
        onChange={ event => onChange(event.target.value) }
        inputRef={ input => (this.input = input) }
        onKeyDown={ event => this.handleKeyDown(event) }
      />
    )
  }
}

SearchField.propTypes = {
  classes: PropTypes.any.isRequired,
  options: PropTypes.any.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  setSelectedItem: PropTypes.func.isRequired,
  selectedItem: PropTypes.any.isRequired
}

const styles = theme => ({
  searchField: {
    paddingLeft: '12px',
    paddingRight: '8px',
    paddingTop: theme.spacing.unit,
    paddingBottom: theme.spacing.unit,
    fontSize: '120%',
    gridArea: 'input'
  }
})

export default withStyles(styles)(SearchField)
